import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from './motionHooks'
import type { JerseyFace } from './squad'
import { CricketBall } from './Stadium'
import { useRollingNumber } from './useRollingNumber'

const CYCLE_MS = 3000
const BADGES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket Keeper']

/**
 * Back of the league shirt, cycling through real registered names and numbers.
 * Tilts toward the pointer on devices that hover. Decorative.
 */
export function HeroJersey({ faces }: { faces: JerseyFace[] }) {
  const [index, setIndex] = useState(0)
  const stage = useRef<HTMLDivElement>(null)
  const face = faces[index % faces.length]

  useEffect(() => {
    if (faces.length < 2 || prefersReducedMotion()) return
    const id = window.setInterval(() => setIndex((i) => i + 1), CYCLE_MS)
    return () => window.clearInterval(id)
  }, [faces.length])

  // Pointer tilt: writes CSS variables directly (no React re-render per move).
  useEffect(() => {
    const el = stage.current
    if (!el || prefersReducedMotion() || !window.matchMedia?.('(hover: hover)').matches) return
    let frame = 0
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--tilt-x', `${(-y * 10).toFixed(2)}deg`)
        el.style.setProperty('--tilt-y', `${(x * 14).toFixed(2)}deg`)
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(frame)
      el.style.setProperty('--tilt-x', '0deg')
      el.style.setProperty('--tilt-y', '0deg')
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  const long = face.name.length > 7
  const roll = useRollingNumber(face.number, index)

  return (
    <div className="hero-stage" ref={stage} aria-hidden="true">
      <div className="hero-stage__ring" />
      {BADGES.map((b, i) => (
        <span key={b} className={`hero-badge hero-badge--${i + 1}`}>
          {b}
        </span>
      ))}
      <CricketBall className="hero-stage__ball" />
      <figure className="hero-jersey">
        <div className="hero-jersey__glow" />
        <svg className="hero-jersey__svg" viewBox="0 0 100 100" focusable="false">
          <path
            className="hero-jersey__shirt"
            d="M33 7 19 12 3 29l13 14 9-6v56h50V37l9 6 13-14L81 12 67 7c-3 8-9 12-17 12S36 15 33 7z"
          />
          <path className="hero-jersey__trim" d="M33 7c3 8 9 12 17 12s14-4 17-12" />
          <path className="hero-jersey__sleeve" d="M3 29l13 14M97 29l-13 14" />
          {/* Keyed by index so each new face replays its entrance animation. */}
          <g key={`n${index}`} className="hero-jersey__name-wrap">
            <text
              className="hero-jersey__name"
              x="50"
              y="38"
              textAnchor="middle"
              {...(long ? { textLength: 46, lengthAdjust: 'spacingAndGlyphs' } : {})}
            >
              {face.name}
            </text>
          </g>
          {/* Scoreboard roll: passing numbers tick in, then the real one slams down. */}
          <g
            key={roll.settled ? `final${index}` : `tick${roll.value}`}
            className={roll.settled ? 'hero-jersey__number-wrap' : 'hero-jersey__number-tick'}
          >
            <text
              className={`hero-jersey__number${roll.settled ? '' : ' hero-jersey__number--rolling'}`}
              x="50"
              y="78"
              textAnchor="middle"
            >
              {roll.value}
            </text>
          </g>
        </svg>
      </figure>
    </div>
  )
}
