import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import '../registration/registration.css'
import { LeagueCrest } from '../registration/components/BrandHeader'
import { AlertIcon } from '../registration/components/icons'
import { PLAYING_ROLES, VILLAGES } from '../registration/constants'
import type { PlayingRole, Village } from '../registration/types'
import { battingLabel, roleLabel, villageLabel } from '../admin/players'
import { PlayerIcon, SearchIcon } from '../admin/icons'
import { DEFAULT_ROSTER_QUERY, filterRoster, type RosterQuery } from './roster'
import { getDefaultRosterService, RosterError, type RosterPlayer, type RosterService } from './rosterService'
import '../shared/controls.css'
import './roster.css'

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; players: RosterPlayer[] }

interface RosterPageProps {
  /** Injected in tests; defaults to the Supabase-backed service. */
  service?: RosterService | null
}

export function RosterPage(props: RosterPageProps) {
  // Created once; a new object per render would re-run the fetch effect forever.
  const [service] = useState(() => (props.service !== undefined ? props.service : getDefaultRosterService()))
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [query, setQuery] = useState<RosterQuery>(DEFAULT_ROSTER_QUERY)
  const search = useDeferredValue(query.search)

  useEffect(() => {
    document.title = 'Players · Miella Super League'
  }, [])

  const fetchPlayers = useCallback(async () => {
    if (!service) {
      setLoad({ status: 'error', message: 'The player list is not available on this site yet.' })
      return
    }
    setLoad({ status: 'loading' })
    try {
      setLoad({ status: 'ready', players: await service.listPlayers() })
    } catch (e) {
      setLoad({ status: 'error', message: e instanceof RosterError ? e.message : 'Could not load the player list.' })
    }
  }, [service])

  useEffect(() => {
    // Fetch on mount: syncing with the backend is what this effect is for.
    // oxlint-disable-next-line react/set-state-in-effect
    void fetchPlayers()
  }, [fetchPlayers])

  const players = useMemo(() => (load.status === 'ready' ? load.players : []), [load])
  const visible = useMemo(() => filterRoster(players, { ...query, search }), [players, query, search])
  const filtered = query.search !== '' || query.village !== 'all' || query.role !== 'all'

  return (
    <div className="roster-page">
      <header className="roster-hero">
        <div className="roster-hero__inner">
          <a className="roster-brand" href="/players">
            <LeagueCrest size={40} />
            <span>
              <span className="roster-brand__name">Miella Super League</span>
              <span className="roster-brand__sub">Season squad</span>
            </span>
          </a>
          <h1 className="roster-title">Registered players</h1>
          <p className="roster-lede">
            {load.status === 'ready'
              ? `${players.length} ${players.length === 1 ? 'player' : 'players'} from Miella, Kirinda and Yagasmulla.`
              : 'Players from Miella, Kirinda and Yagasmulla.'}
          </p>
          <a className="btn btn--primary roster-cta" href="/">
            Register to play
          </a>
        </div>
      </header>

      <main className="roster-main">
        <div className="roster-tools">
          <label className="search">
            <span className="sr-only">Search players</span>
            <SearchIcon size={18} />
            <input
              className="search__input"
              type="search"
              placeholder="Search name or jersey number"
              value={query.search}
              onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
            />
          </label>
          <div className="roster-filters">
            <Chips
              label="Village"
              value={query.village}
              options={VILLAGES}
              onChange={(v) => setQuery((q) => ({ ...q, village: v as Village | 'all' }))}
            />
            <Chips
              label="Role"
              value={query.role}
              options={PLAYING_ROLES}
              onChange={(v) => setQuery((q) => ({ ...q, role: v as PlayingRole | 'all' }))}
            />
          </div>
          {load.status === 'ready' && filtered && (
            <p className="roster-count" aria-live="polite">
              Showing {visible.length} of {players.length}
            </p>
          )}
        </div>

        {load.status === 'error' && (
          <div className="alert" role="alert">
            <AlertIcon size={18} />
            <div className="alert__body">
              <p>{load.message}</p>
              {service && (
                <button type="button" className="link-btn" onClick={fetchPlayers}>
                  Try again
                </button>
              )}
            </div>
          </div>
        )}

        {load.status === 'loading' && (
          <ul className="squad" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="squad-card squad-card--skeleton">
                <span className="squad-card__photo skeleton" />
                <span className="squad-card__body">
                  <span className="skeleton skeleton--line" />
                  <span className="skeleton skeleton--line skeleton--short" />
                </span>
              </li>
            ))}
          </ul>
        )}

        {load.status === 'ready' && players.length === 0 && (
          <div className="empty">
            <PlayerIcon size={28} />
            <p className="empty__title">No players yet</p>
            <p className="empty__text">Be the first from your village to join the league.</p>
            <a className="btn btn--secondary btn--sm" href="/">
              Register to play
            </a>
          </div>
        )}

        {load.status === 'ready' && players.length > 0 && visible.length === 0 && (
          <div className="empty">
            <SearchIcon size={28} />
            <p className="empty__title">No players match</p>
            <p className="empty__text">Try another name or number, or clear the filters.</p>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setQuery(DEFAULT_ROSTER_QUERY)}>
              Clear filters
            </button>
          </div>
        )}

        {visible.length > 0 && (
          <ul className="squad" aria-label="Players">
            {visible.map((p) => (
              <li key={p.id} className="squad-card">
                {p.photoUrl ? (
                  <img className="squad-card__photo" src={p.photoUrl} alt={p.fullName} loading="lazy" decoding="async" />
                ) : (
                  <span className="squad-card__photo squad-card__photo--empty" aria-hidden="true">
                    <PlayerIcon size={36} />
                  </span>
                )}
                <div className="squad-card__body">
                  <div className="squad-card__head">
                    <h2 className="squad-card__name">{p.fullName}</h2>
                    <span className="squad-card__number" aria-label={`Jersey number ${p.jerseyNumber}`}>
                      {p.jerseyNumber}
                    </span>
                  </div>
                  <p className="squad-card__role">{roleLabel(p.playingRole)}</p>
                  <dl className="squad-card__facts">
                    <div>
                      <dt>Bats</dt>
                      <dd>{battingLabel(p.battingStyle)}</dd>
                    </div>
                    <div>
                      <dt>Village</dt>
                      <dd>{villageLabel(p.village)}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="page__footer roster-footer">
        <p>Miella Super League · Official Player Registration</p>
        <p className="page__credit">
          Powered by <strong>ValGrow Labs</strong>
        </p>
      </footer>
    </div>
  )
}

function Chips({
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
  return (
    <div className="chips" role="group" aria-label={label}>
      <span className="chips__label" aria-hidden="true">
        {label}
      </span>
      {[{ value: 'all', label: 'All' }, ...options].map((o) => (
        <button key={o.value} type="button" className="chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
