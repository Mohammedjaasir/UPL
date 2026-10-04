import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import '../registration/registration.css'
import { LeagueCrest } from '../registration/components/BrandHeader'
import { AllRounderIcon, ArrowRightIcon, BallIcon, BatIcon, StumpsIcon } from '../registration/components/icons'
import { PLAYING_ROLES } from '../registration/constants'
import type { PlayingRole } from '../registration/types'
import { battingLabel, roleLabel, villageLabel } from '../admin/players'
import { PlayerIcon } from '../admin/icons'
import { getDefaultRosterService, type RosterPlayer, type RosterService } from '../roster/rosterService'
import { HeroJersey } from './HeroJersey'
import { JerseyDesigner } from './JerseyDesigner'
import './landing.css'
import { useCountUp, useInView } from './motionHooks'
import { Reveal } from './Reveal'
import { jerseyFaces, latestPlayers, villageCounts, type VillageCount } from './squad'
import { Stadium } from './Stadium'

interface LandingPageProps {
  /** Injected in tests; defaults to the Supabase-backed public roster. */
  service?: RosterService | null
}

const FACTS = [
  { value: 3, label: 'Villages' },
  { value: 4, label: 'Playing roles' },
  { value: 99, label: 'Shirt numbers' },
  { value: 7, label: 'Jersey sizes' },
]

const ROLES: Record<PlayingRole, { icon: ReactNode; text: string }> = {
  batsman: { icon: <BatIcon size={26} />, text: 'Scores the runs' },
  bowler: { icon: <BallIcon size={26} />, text: 'Takes the wickets' },
  all_rounder: { icon: <AllRounderIcon size={26} />, text: 'Bats and bowls' },
  wicket_keeper: { icon: <StumpsIcon size={26} />, text: 'Behind the stumps' },
}

const STEPS = [
  { title: 'Your details', text: 'Full name, date of birth, your village and WhatsApp number.' },
  { title: 'Your kit', text: 'Playing role, batting style, a photo, jersey size, and the name and number for your shirt.' },
  { title: 'Check and submit', text: 'Review everything on one screen, submit, and get your registration reference.' },
]

const TICKER = ['Miella', 'Kirinda', 'Yagasmulla', 'Registration open']

export function LandingPage(props: LandingPageProps) {
  const [service] = useState(() => (props.service !== undefined ? props.service : getDefaultRosterService()))
  // null = still loading (or unavailable): sections that need live data stay quiet instead of showing zeros.
  const [players, setPlayers] = useState<RosterPlayer[] | null>(null)
  const heroRef = useRef<HTMLElement>(null)
  const designRef = useRef<HTMLElement>(null)
  const [pastHero, setPastHero] = useState(false)
  const [designInView, setDesignInView] = useState(false)

  useEffect(() => {
    document.title = 'Miella Super League · Player Registration'
  }, [])

  useEffect(() => {
    let active = true
    service
      ?.listPlayers()
      .then((list) => active && setPlayers(list))
      .catch(() => {
        /* The landing page works without live numbers. */
      })
    return () => {
      active = false
    }
  }, [service])

  // Mobile register bar: only once the hero's own button has scrolled away,
  // and not while the jersey designer (which has its own register button) is on screen.
  useEffect(() => {
    const hero = heroRef.current
    const design = designRef.current
    if (!hero || !design || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target === hero) setPastHero(!e.isIntersecting)
          else setDesignInView(e.isIntersecting)
        }
      },
      { threshold: 0.15 },
    )
    io.observe(hero)
    io.observe(design)
    return () => io.disconnect()
  }, [])

  const showBar = pastHero && !designInView

  const faces = useMemo(() => jerseyFaces(players ?? []), [players])
  const takenNumbers = useMemo(() => new Set((players ?? []).map((p) => p.jerseyNumber)), [players])
  const total = players?.length ?? null

  return (
    <div className="landing">
      <header className="lnav">
        <a className="lnav__brand" href="/" aria-label="Miella Super League home">
          <LeagueCrest size={34} />
          <span className="lnav__name">Miella Super League</span>
        </a>
        <nav className="lnav__links" aria-label="Main">
          <a className="lnav__link" href="/players">
            Players
          </a>
          <a className="btn btn--primary btn--sm lnav__cta" href="/register">
            Register
          </a>
        </nav>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="hero" ref={heroRef} aria-labelledby="hero-title">
          <Stadium />
          <div className="hero__inner">
            <div className="hero__copy">
              <p className="hero__eyebrow">Player registration open</p>
              <h1 id="hero-title" className="hero__title">
                <span className="hero__line hero__line--1">Three villages.</span>
                <span className="hero__line hero__line--2">One league.</span>
              </h1>
              <p className="hero__sub">
                Register from your phone in a few minutes and get your name and number on the league jersey.
              </p>
              <div className="hero__ctas">
                <a className="btn btn--primary hero__cta" href="/register">
                  Register now
                  <span className="hero__cta-icon" aria-hidden="true">
                    <ArrowRightIcon size={18} />
                  </span>
                </a>
                <a className="btn btn--secondary hero__cta" href="/players">
                  See the players
                </a>
              </div>
            </div>
            <div className="hero__visual">
              <HeroJersey faces={faces} />
            </div>
          </div>
        </section>

        {/* ---------- Ticker ---------- */}
        <div className="ticker" aria-hidden="true">
          <div className="ticker__track">
            {[0, 1].map((copy) => (
              <span key={copy} className="ticker__group">
                {TICKER.map((word, i) => (
                  <span key={word} className={`ticker__word${i % 2 ? ' ticker__word--solid' : ''}`}>
                    {word}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        {/* ---------- Facts ---------- */}
        <section className="facts" aria-label="The league in numbers">
          <ul className="facts__list">
            {FACTS.map((f, i) => (
              <Fact key={f.label} value={f.value} label={f.label} index={i} />
            ))}
          </ul>
        </section>

        {/* ---------- Design your jersey ---------- */}
        <section className="lsec design" ref={designRef} aria-labelledby="design-title">
          <div className="lsec__inner">
            <Reveal className="design__head">
              <h2 id="design-title" className="lsec__title">
                Design your jersey
              </h2>
              <p className="lsec__lede">
                Try your name and number on the league shirt. We'll carry them into your registration.
              </p>
            </Reveal>
            <Reveal index={1}>
              <JerseyDesigner takenNumbers={takenNumbers} />
            </Reveal>
          </div>
        </section>

        {/* ---------- Roles ---------- */}
        <section className="lsec roles" aria-labelledby="roles-title">
          <div className="lsec__inner">
            <Reveal>
              <h2 id="roles-title" className="lsec__title">
                Every role has a place
              </h2>
            </Reveal>
            <ul className="roles__grid">
              {PLAYING_ROLES.map((r, i) => {
                const count = players?.filter((p) => p.playingRole === r.value).length
                return (
                  <Reveal as="li" key={r.value} index={i} className="role-card">
                    <span className="role-card__icon">{ROLES[r.value].icon}</span>
                    <h3 className="role-card__title">{r.label}</h3>
                    <p className="role-card__text">{ROLES[r.value].text}</p>
                    {count !== undefined && (
                      <p className="role-card__count">
                        {count} registered
                      </p>
                    )}
                  </Reveal>
                )
              })}
            </ul>
          </div>
        </section>

        {/* ---------- Villages ---------- */}
        <section className="lsec villages" aria-labelledby="villages-title">
          <div className="lsec__inner">
            <Reveal>
              <h2 id="villages-title" className="lsec__title">
                Miella. Kirinda. Yagasmulla.
              </h2>
              <p className="lsec__lede">
                {total === null
                  ? 'Every player represents one of the three villages.'
                  : total === 0
                    ? 'Registration has just opened. Be the first name on the list.'
                    : `${total} ${total === 1 ? 'player has' : 'players have'} registered so far.`}
              </p>
            </Reveal>
            <div className="villages__grid">
              {villageCounts(players ?? []).map((v, i) => (
                <VillageTile key={v.value} village={v} index={i} live={players !== null} />
              ))}
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section className="lsec steps" aria-labelledby="steps-title">
          <div className="lsec__inner">
            <Reveal>
              <h2 id="steps-title" className="lsec__title">
                Registration in three steps
              </h2>
            </Reveal>
            <ol className="steps__list">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.title} index={i} className="steps__item">
                  <span className="steps__dot" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="steps__title">{s.title}</h3>
                  <p className="steps__text">{s.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Squad ---------- */}
        {players !== null && (
          <section className="lsec squad-sec" aria-labelledby="squad-title">
            <div className="lsec__inner">
              <Reveal className="squad-sec__head">
                <h2 id="squad-title" className="lsec__title">
                  The squad so far
                </h2>
                <a className="btn btn--secondary btn--sm" href="/players">
                  See all players
                </a>
              </Reveal>
              <SquadGrid players={latestPlayers(players, 8)} />
            </div>
          </section>
        )}

        {/* ---------- Final call ---------- */}
        <section className="lsec final" aria-labelledby="final-title">
          <div className="lsec__inner">
            <Reveal className="final__card">
              <span className="final__number" aria-hidden="true">
                MSL
              </span>
              <h2 id="final-title" className="final__title">
                Your name on the back.
              </h2>
              <p className="final__text">Pick your number, choose your jersey size and send your registration today.</p>
              <a className="btn btn--primary final__cta" href="/register">
                Register now
              </a>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="lfoot">
        <div className="lfoot__brand">
          <LeagueCrest size={28} />
          <span>Miella Super League</span>
        </div>
        <nav className="lfoot__links" aria-label="Footer">
          <a href="/register">Register</a>
          <a href="/players">Players</a>
          <a href="/admin">Organisers</a>
        </nav>
        <p className="page__credit">
          Powered by <strong>ValGrow Labs</strong>
        </p>
      </footer>

      <div className={`mobile-cta${showBar ? ' is-shown' : ''}`} aria-hidden={!showBar}>
        <a className="btn btn--primary btn--block" href="/register" tabIndex={showBar ? 0 : -1}>
          Register now
        </a>
      </div>
    </div>
  )
}

function Fact({ value, label, index }: { value: number; label: string; index: number }) {
  const { ref, inView } = useInView<HTMLLIElement>()
  const shown = useCountUp(value, inView, 1100)
  return (
    <li ref={ref} className={`fact reveal${inView ? ' is-in' : ''}`} style={{ '--i': index } as CSSProperties}>
      <span className="fact__value">{shown}</span>
      <span className="fact__label">{label}</span>
    </li>
  )
}

function VillageTile({ village, index, live }: { village: VillageCount; index: number; live: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const count = useCountUp(village.count, inView && live)
  return (
    <div ref={ref} className={`village-tile reveal${inView ? ' is-in' : ''}`} style={{ '--i': index } as CSSProperties}>
      <span className="village-tile__ghost" aria-hidden="true">
        {village.label}
      </span>
      <p className="village-tile__name">{village.label}</p>
      <p className="village-tile__count">
        {live ? (
          <>
            <span className="village-tile__num">{count}</span>
            <span className="village-tile__unit">{village.count === 1 ? 'player' : 'players'}</span>
          </>
        ) : (
          <span className="village-tile__unit">Registration open</span>
        )}
      </p>
    </div>
  )
}

/** Newest players, topped up with "your card here" slots so a young squad never looks empty. */
function SquadGrid({ players }: { players: RosterPlayer[] }) {
  const open = Math.max(0, 4 - players.length)
  return (
    <ul className="squad-grid" aria-label="Recently registered players">
      {players.map((p, i) => (
        <Reveal as="li" key={p.id} index={i} className="squad-tile">
          {p.photoUrl ? (
            <img className="squad-tile__photo" src={p.photoUrl} alt={p.fullName} loading="lazy" decoding="async" />
          ) : (
            <span className="squad-tile__photo squad-tile__photo--empty">
              <PlayerIcon size={30} />
            </span>
          )}
          <span className="squad-tile__body">
            <span className="squad-tile__name">{p.fullName}</span>
            <span className="squad-tile__meta">
              {roleLabel(p.playingRole)}, {battingLabel(p.battingStyle)}
            </span>
            <span className="squad-tile__village">{villageLabel(p.village)}</span>
          </span>
          <span className="squad-tile__number">{p.jerseyNumber}</span>
        </Reveal>
      ))}
      {Array.from({ length: open }, (_, i) => (
        <Reveal as="li" key={`open-${i}`} index={players.length + i} className="squad-tile squad-tile--open">
          <a className="squad-tile__open" href="/register">
            <PlayerIcon size={30} />
            <span className="squad-tile__open-title">Your card here</span>
            <span className="squad-tile__open-text">Register to join the squad</span>
          </a>
        </Reveal>
      ))}
    </ul>
  )
}
