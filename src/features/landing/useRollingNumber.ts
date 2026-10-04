import { useEffect, useState } from 'react'
import { prefersReducedMotion } from './motionHooks'

/** Gaps between ticks: fast at first, slowing down before it lands (a slot-machine stop). */
const TICKS_MS = [45, 45, 45, 50, 55, 60, 70, 85, 105, 130, 165]

/**
 * Scoreboard-style roll: when `target` changes, show a run of passing numbers,
 * then settle on the target. `settled` flips true on the final number.
 * Instant under reduced motion. Deterministic (no Math.random).
 */
export function useRollingNumber(target: string, seed: number) {
  const [state, setState] = useState({ value: target, settled: true })

  useEffect(() => {
    if (prefersReducedMotion()) {
      // oxlint-disable-next-line react/set-state-in-effect
      setState({ value: target, settled: true })
      return
    }
    const timers: number[] = []
    let elapsed = 0
    TICKS_MS.forEach((gap, k) => {
      elapsed += gap
      // Spread the passing numbers over 1-99 so they read as a spin, not a count.
      const passing = String(((seed * 37 + k * 29 + 11) % 99) + 1)
      timers.push(window.setTimeout(() => setState({ value: passing, settled: false }), elapsed))
    })
    timers.push(window.setTimeout(() => setState({ value: target, settled: true }), elapsed + 190))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [target, seed])

  return state
}
