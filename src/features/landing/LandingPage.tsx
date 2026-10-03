import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import '../registration/registration.css'
import { LeagueCrest } from '../registration/components/BrandHeader'
import { ArrowRightIcon } from '../registration/components/icons'
import { roleLabel } from '../admin/players'
import { PlayerIcon } from '../admin/icons'
import { getDefaultRosterService, type RosterPlayer, type RosterService } from '../roster/rosterService'
import { HeroJersey } from './HeroJersey'
import './landing.css'
import { useCountUp, useInView } from './motionHooks'
import { Reveal } from './Reveal'
import { jerseyFaces, latestPlayers, villageCounts, type VillageCount } from './squad'

interface LandingPageProps {
  /** Injected in tests; defaults to the Supabase-backed public roster. */
  service?: RosterService | null
}

const STEPS = [
  { title: 'Your details', text: 'Full name, date of birth, your village and WhatsApp number.' },
  { title: 'Your kit', text: 'Playing role, batting style, a photo, jersey size, and the name and number for your shirt.' },
  { title: 'Check and submit', text: 'Review everything on one screen, submit, and get your registration reference.' },
]

export function LandingPage(props: LandingPageProps) {
  const [service] = useState(() => (props.service !== undefined ? props.service : getDefaultRosterService()))
  // null = still loading (or unavailable): sections that need live data stay quiet instead of showing zeros.
  const [players, setPlayers] = useState<RosterPlayer[] | null>(null)
  const heroRef = useRef<HTMLElement>(null)
  const [pastHero, setPastHero] = useState(false)

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

  // Mobile register bar: only once the hero's own button has scrolled away.
  useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const faces = useMemo(() => jerseyFaces(players ?? []), [players])
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
          <div className="hero__beams" aria-hidden="true">
            <span className="hero__beam hero__beam--l" />
            <span className="hero__beam hero__beam--r" />
          </div>
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
            </div>
            {players.length === 0 ? (
              <div className="lsec__inner">
                <Reveal className="squad-empty">
                  <PlayerIcon size={28} />
                  <p>No players yet. Your card could be the first one here.</p>
                </Reveal>
              </div>
            ) : (
              <SquadStrip players={latestPlayers(players)} />
            )}
          </section>
        )}

        {/* ---------- Final call ---------- */}
        <section className="lsec final" aria-labelledby="final-title">
          <div className="lsec__inner">
            <Reveal className="final__card">
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

      <div className={`mobile-cta${pastHero ? ' is-shown' : ''}`} aria-hidden={!pastHero}>
        <a className="btn btn--primary btn--block" href="/register" tabIndex={pastHero ? 0 : -1}>
          Register now
        </a>
      </div>
    </div>
  )
}

function VillageTile({ village, index, live }: { village: VillageCount; index: number; live: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const count = useCountUp(village.count, inView && live)
  return (
    <div ref={ref} className={`village-tile reveal${inView ? ' is-in' : ''}`} style={{ '--i': index } as CSSProperties}>
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

function SquadStrip({ players }: { players: RosterPlayer[] }) {
  // Enough cards to fill a wide screen: loop them as a marquee. Otherwise a still row.
  const marquee = players.length >= 6
  const card = (p: RosterPlayer, hidden = false) => (
    <li key={`${hidden ? 'dup-' : ''}${p.id}`} className="strip-card" aria-hidden={hidden || undefined}>
      {p.photoUrl ? (
        <img className="strip-card__photo" src={p.photoUrl} alt={hidden ? '' : p.fullName} loading="lazy" decoding="async" />
      ) : (
        <span className="strip-card__photo strip-card__photo--empty">
          <PlayerIcon size={28} />
        </span>
      )}
      <span className="strip-card__body">
        <span className="strip-card__name">{p.fullName}</span>
        <span className="strip-card__meta">{roleLabel(p.playingRole)}</span>
      </span>
      <span className="strip-card__number">{p.jerseyNumber}</span>
    </li>
  )
  return (
    <div className={`strip${marquee ? ' strip--marquee' : ''}`}>
      <ul className="strip__track" aria-label="Recently registered players">
        {players.map((p) => card(p))}
        {marquee && players.map((p) => card(p, true))}
      </ul>
    </div>
  )
}
