import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { PLAYING_ROLES, VILLAGES } from '../registration/constants'
import { LeagueCrest } from '../registration/components/BrandHeader'
import { AlertIcon, CheckIcon, RefreshIcon } from '../registration/components/icons'
import type { PlayingRole, Village } from '../registration/types'
import { AdminError, type AdminService, type Organiser } from './adminService'
import { Avatar } from './Avatar'
import { CloseIcon, DownloadIcon, PlayerIcon, SearchIcon, SignOutIcon } from './icons'
import { PlayerDialog } from './PlayerDialog'
import {
  DEFAULT_QUERY,
  displayRegisteredAt,
  displayWhatsapp,
  queryPlayers,
  roleLabel,
  summarize,
  toCsv,
  villageLabel,
  type Breakdown,
  type Player,
  type PlayerQuery,
  type SortKey,
} from './players'

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; players: Player[]; loadedAt: Date }

interface DashboardProps {
  service: AdminService
  organiser: Organiser
  onSignOut: () => void
}

export function Dashboard({ service, organiser, onSignOut }: DashboardProps) {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState<PlayerQuery>(DEFAULT_QUERY)
  const [selected, setSelected] = useState<Player | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(query.search)

  const fetchPlayers = useCallback(async () => {
    setRefreshing(true)
    try {
      const players = await service.listPlayers()
      setLoad({ status: 'ready', players, loadedAt: new Date() })
    } catch (error) {
      setLoad({
        status: 'error',
        message: error instanceof AdminError ? error.message : 'Could not load registrations.',
      })
    } finally {
      setRefreshing(false)
    }
  }, [service])

  useEffect(() => {
    // Fetch on mount: syncing with the backend is what this effect is for.
    // oxlint-disable-next-line react/set-state-in-effect
    void fetchPlayers()
  }, [fetchPlayers])

  const players = useMemo(() => (load.status === 'ready' ? load.players : []), [load])
  const stats = useMemo(() => summarize(players), [players])
  const visible = useMemo(
    () => queryPlayers(players, { ...query, search: deferredSearch }),
    [players, query, deferredSearch],
  )
  const filtered = query.search !== '' || query.village !== 'all' || query.role !== 'all'

  const deletePlayer = useCallback(
    async (player: Player) => {
      await service.deletePlayer(player)
      setLoad((current) =>
        current.status === 'ready' ? { ...current, players: current.players.filter((p) => p.id !== player.id) } : current,
      )
      setSelected(null)
      setNotice(`Deleted ${player.fullName}. Jersey #${player.jerseyNumber} is free again.`)
    },
    [service],
  )

  function exportCsv() {
    const blob = new Blob([toCsv(visible)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `msl-players-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="admin-bar__brand">
          <LeagueCrest size={36} />
          <div>
            <p className="admin-bar__name">Miella Super League</p>
            <p className="admin-bar__sub">Organisers</p>
          </div>
        </div>
        <div className="admin-bar__actions">
          <span className="admin-bar__user" title={organiser.email}>
            {organiser.email}
          </span>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onSignOut}>
            <SignOutIcon size={18} />
            <span className="admin-bar__label">Sign out</span>
          </button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-head">
          <div>
            <h1 className="admin-title">Registered players</h1>
            <p className="admin-updated" aria-live="polite">
              {load.status === 'ready' ? `Updated ${displayRegisteredAt(load.loadedAt.toISOString())}` : ' '}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={fetchPlayers}
            disabled={refreshing}
            aria-busy={refreshing}
          >
            <RefreshIcon size={18} className={refreshing ? 'spinner' : undefined} />
            Refresh
          </button>
        </div>

        {notice && (
          <div className="notice" role="status">
            <CheckIcon size={18} />
            <p className="notice__text">{notice}</p>
            <button type="button" className="icon-btn notice__close" onClick={() => setNotice(null)} aria-label="Dismiss">
              <CloseIcon size={18} />
            </button>
          </div>
        )}

        {load.status === 'error' && (
          <div className="alert admin-alert" role="alert">
            <AlertIcon size={18} />
            <div className="alert__body">
              <p className="alert__title">Couldn't load registrations</p>
              <p>{load.message}</p>
              <button type="button" className="link-btn" onClick={fetchPlayers}>
                Try again
              </button>
            </div>
          </div>
        )}

        <section className="stats" aria-label="Summary">
          <div className="stat stat--total">
            <p className="stat__label">Players</p>
            <p className="stat__value">{load.status === 'ready' ? stats.total : '-'}</p>
          </div>
          <BreakdownPanel title="Village" rows={stats.villages} loading={load.status === 'loading'} />
          <BreakdownPanel title="Playing role" rows={stats.roles} loading={load.status === 'loading'} />
          <BreakdownPanel title="Jersey size" rows={stats.sizes} loading={load.status === 'loading'} compact />
        </section>

        <section className="roster" aria-labelledby="roster-title">
          <h2 id="roster-title" className="sr-only">
            Player list
          </h2>

          <div className="toolbar">
            <label className="search">
              <span className="sr-only">Search players</span>
              <SearchIcon size={18} />
              <input
                className="search__input"
                type="search"
                placeholder="Search name, number or phone"
                value={query.search}
                onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
              />
            </label>

            <div className="toolbar__row">
              <FilterChips
                label="Village"
                value={query.village}
                options={VILLAGES}
                onChange={(village) => setQuery((q) => ({ ...q, village: village as Village | 'all' }))}
              />
              <FilterChips
                label="Role"
                value={query.role}
                options={PLAYING_ROLES}
                onChange={(role) => setQuery((q) => ({ ...q, role: role as PlayingRole | 'all' }))}
              />
            </div>

            <div className="toolbar__row toolbar__row--end">
              <p className="toolbar__count">
                {load.status === 'ready' && (filtered ? `${visible.length} of ${players.length} players` : `${players.length} players`)}
              </p>
              <label className="sort">
                <span className="sort__label">Sort</span>
                <select
                  className="sort__select"
                  value={query.sort}
                  onChange={(e) => setQuery((q) => ({ ...q, sort: e.target.value as SortKey }))}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name A-Z</option>
                  <option value="number">Jersey number</option>
                </select>
              </label>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={exportCsv}
                disabled={load.status !== 'ready' || visible.length === 0}
              >
                <DownloadIcon size={18} />
                Export CSV
              </button>
            </div>
          </div>

          {load.status === 'loading' && <SkeletonRows />}

          {load.status === 'ready' && players.length === 0 && (
            <div className="empty">
              <PlayerIcon size={28} />
              <p className="empty__title">No registrations yet</p>
              <p className="empty__text">Players appear here as soon as they submit the registration form.</p>
              <a className="btn btn--secondary btn--sm" href="/">
                Open registration form
              </a>
            </div>
          )}

          {load.status === 'ready' && players.length > 0 && visible.length === 0 && (
            <div className="empty">
              <SearchIcon size={28} />
              <p className="empty__title">No players match</p>
              <p className="empty__text">Try a shorter search, or clear the filters.</p>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setQuery(DEFAULT_QUERY)}>
                Clear filters
              </button>
            </div>
          )}

          {visible.length > 0 && (
            <>
              <div className="players__head" aria-hidden="true">
                <span>Player</span>
                <span>No.</span>
                <span>Village</span>
                <span>WhatsApp</span>
                <span>Kit</span>
                <span>Registered</span>
              </div>
              <ul className="players" aria-label="Registered players">
                {visible.map((p) => (
                  <li key={p.id}>
                    <PlayerRowButton player={p} onOpen={() => setSelected(p)} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </main>

      <PlayerDialog player={selected} onClose={() => setSelected(null)} onDelete={deletePlayer} />
    </div>
  )
}

function PlayerRowButton({ player: p, onOpen }: { player: Player; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="player"
      onClick={onOpen}
      aria-label={`${p.fullName}, number ${p.jerseyNumber}, ${roleLabel(p.playingRole)}, ${villageLabel(p.village)}`}
    >
      <span className="player__who">
        <Avatar player={p} />
        <span className="player__text">
          <span className="player__name">{p.fullName}</span>
          <span className="player__meta">
            {roleLabel(p.playingRole)}
            <span className="player__meta-village">, {villageLabel(p.village)}</span>
          </span>
        </span>
      </span>
      <span className="player__number">
        #{p.jerseyNumber}
      </span>
      <span className="player__col">
        {villageLabel(p.village)}
      </span>
      <span className="player__col player__phone">
        {displayWhatsapp(p.whatsappNumber)}
      </span>
      <span className="player__col">
        {p.jerseyName} · {p.jerseySize}
      </span>
      <span className="player__col player__date">
        {displayRegisteredAt(p.createdAt)}
      </span>
    </button>
  )
}

function BreakdownPanel({
  title,
  rows,
  loading,
  compact = false,
}: {
  title: string
  rows: Breakdown[]
  loading: boolean
  compact?: boolean
}) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className={`stat stat--breakdown${compact ? ' stat--compact' : ''}`}>
      <p className="stat__label">{title}</p>
      <ul className="bars">
        {rows.map((r) => (
          <li key={r.value} className="bars__row">
            <span className="bars__label">{r.label}</span>
            <span className="bars__track" aria-hidden="true">
              {!loading && r.count > 0 && (
                <span className="bars__fill" style={{ width: `${(r.count / max) * 100}%` }} />
              )}
            </span>
            <span className="bars__count">{loading ? '-' : r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FilterChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const all = [{ value: 'all', label: 'All' }, ...options]
  return (
    <div className="chips" role="group" aria-label={label}>
      <span className="chips__label" aria-hidden="true">
        {label}
      </span>
      {all.map((o) => (
        <button
          key={o.value}
          type="button"
          className="chip"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="players players--skeleton" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="player player--skeleton">
          <span className="player__who">
            <span className="avatar skeleton" />
            <span className="player__text">
              <span className="skeleton skeleton--line" />
              <span className="skeleton skeleton--line skeleton--short" />
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}
