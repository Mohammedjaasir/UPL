import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AllRounderIcon, ArrowRightIcon, BallIcon, BatIcon, StumpsIcon } from '../registration/components/icons'
import { PLAYING_ROLES } from '../registration/constants'
import type { PlayingRole } from '../registration/types'
import { prefillDraft } from '../registration/useRegistrationForm'
import type { RosterPlayer } from '../roster/rosterService'
import { prefersReducedMotion } from './motionHooks'

const CYCLE_MS = 4500

const ROLE_INFO: Record<
  PlayingRole,
  { icon: (size: number) => ReactNode; line: string; detail: string; plural: string; article: 'a' | 'an' }
> = {
  batsman: {
    icon: (s) => <BatIcon size={s} />,
    line: 'Scores the runs',
    detail: 'At the crease to build the innings.',
    plural: 'batsmen',
    article: 'a',
  },
  bowler: {
    icon: (s) => <BallIcon size={s} />,
    line: 'Takes the wickets',
    detail: 'Ball in hand, running in to bowl.',
    plural: 'bowlers',
    article: 'a',
  },
  all_rounder: {
    icon: (s) => <AllRounderIcon size={s} />,
    line: 'Bats and bowls',
    detail: 'In the game with bat and ball.',
    plural: 'all-rounders',
    article: 'an',
  },
  wicket_keeper: {
    icon: (s) => <StumpsIcon size={s} />,
    line: 'Behind the stumps',
    detail: 'Gloves on, behind the wicket.',
    plural: 'wicket keepers',
    article: 'a',
  },
}

/** Interactive role picker: four tabs and one big showcase card. */
export function RoleShowcase({ players }: { players: RosterPlayer[] | null }) {
  const id = useId()
  const [active, setActive] = useState(0)
  const [userPicked, setUserPicked] = useState(false)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])
  const role = PLAYING_ROLES[active]
  const info = ROLE_INFO[role.value]
  const count = (r: PlayingRole) => players?.filter((p) => p.playingRole === r).length

  // Gentle auto-advance until the visitor chooses a role themselves.
  useEffect(() => {
    if (userPicked || prefersReducedMotion()) return
    const t = window.setInterval(() => setActive((i) => (i + 1) % PLAYING_ROLES.length), CYCLE_MS)
    return () => window.clearInterval(t)
  }, [userPicked])

  function pick(i: number, focus = false) {
    setUserPicked(true)
    setActive(i)
    if (focus) tabs.current[i]?.focus()
  }

  // Standard tablist keys: arrows move, Home/End jump.
  function onKey(e: KeyboardEvent) {
    const last = PLAYING_ROLES.length - 1
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? active === last ? 0 : active + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? active === 0 ? last : active - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null
    if (next === null) return
    e.preventDefault()
    pick(next, true)
  }

  const n = count(role.value)

  return (
    <div className="showcase">
      <div className="showcase__tabs" role="tablist" aria-label="Playing roles" aria-orientation="vertical" onKeyDown={onKey}>
        {PLAYING_ROLES.map((r, i) => {
          const selected = i === active
          const c = count(r.value)
          return (
            <button
              key={r.value}
              ref={(el) => {
                tabs.current[i] = el
              }}
              id={`${id}-tab-${r.value}`}
              type="button"
              role="tab"
              className="showcase__tab"
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => pick(i)}
            >
              <span className="showcase__tab-icon" aria-hidden="true">
                {ROLE_INFO[r.value].icon(22)}
              </span>
              <span className="showcase__tab-name">{r.label}</span>
              {c !== undefined && <span className="showcase__tab-count">{c}</span>}
              {selected && !userPicked && <span className="showcase__timer" aria-hidden="true" key={active} />}
            </button>
          )
        })}
      </div>

      <div
        id={`${id}-panel`}
        className="showcase__stage"
        role="tabpanel"
        aria-labelledby={`${id}-tab-${role.value}`}
      >
        {/* Keyed so the entrance animation replays on every role change. */}
        <div key={role.value} className="showcase__content">
          <span className="showcase__ghost" aria-hidden="true">
            {role.label}
          </span>
          <span className="showcase__icon" aria-hidden="true">
            {info.icon(120)}
          </span>
          <div className="showcase__copy">
            <h3 className="showcase__name">{role.label}</h3>
            <p className="showcase__line">{info.line}</p>
            <p className="showcase__detail">{info.detail}</p>
            <p className="showcase__count">
              {n === undefined
                ? 'Pick it in the Your kit step.'
                : n === 0
                  ? `No ${info.plural} yet. Be the first.`
                  : `${n} ${n === 1 ? 'player has' : 'players have'} registered as ${info.article} ${role.label.toLowerCase()}.`}
            </p>
            <a
              className="btn btn--primary showcase__cta"
              href="/register"
              onClick={() => prefillDraft({ playingRole: role.value })}
            >
              Register as {info.article} {role.label}
              <ArrowRightIcon size={18} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
