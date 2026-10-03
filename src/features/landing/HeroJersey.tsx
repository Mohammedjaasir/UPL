import { useEffect, useState } from 'react'
import { prefersReducedMotion } from './motionHooks'
import type { JerseyFace } from './squad'

const CYCLE_MS = 3000

/** Back of the league shirt, cycling through real registered names and numbers. Decorative. */
export function HeroJersey({ faces }: { faces: JerseyFace[] }) {
  const [index, setIndex] = useState(0)
  const face = faces[index % faces.length]

  useEffect(() => {
    if (faces.length < 2 || prefersReducedMotion()) return
    const id = window.setInterval(() => setIndex((i) => i + 1), CYCLE_MS)
    return () => window.clearInterval(id)
  }, [faces.length])

  const long = face.name.length > 7

  return (
    <figure className="hero-jersey" aria-hidden="true">
      <div className="hero-jersey__glow" />
      <svg className="hero-jersey__svg" viewBox="0 0 100 100" focusable="false">
        <path
          className="hero-jersey__shirt"
          d="M33 7 19 12 3 29l13 14 9-6v56h50V37l9 6 13-14L81 12 67 7c-3 8-9 12-17 12S36 15 33 7z"
        />
        <path className="hero-jersey__trim" d="M33 7c3 8 9 12 17 12s14-4 17-12" />
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
        <g key={`d${index}`} className="hero-jersey__number-wrap">
          <text className="hero-jersey__number" x="50" y="78" textAnchor="middle">
            {face.number}
          </text>
        </g>
      </svg>
    </figure>
  )
}
