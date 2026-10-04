import { VILLAGES } from '../registration/constants'
import type { RosterPlayer } from '../roster/rosterService'

export interface VillageCount {
  value: string
  label: string
  count: number
}

export function villageCounts(players: RosterPlayer[]): VillageCount[] {
  return VILLAGES.map((v) => ({ value: v.value, label: v.label, count: players.filter((p) => p.village === v.value).length }))
}

/** Newest registrations first, for the squad strip. */
export function latestPlayers(players: RosterPlayer[], limit = 12): RosterPlayer[] {
  return [...players].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
}

export interface JerseyFace {
  name: string
  number: string
}

/** Popular shirt numbers to suggest on the invitation faces, if still free. */
const SUGGESTED_NUMBERS = [10, 7, 23, 18, 45, 99, 1, 11, 33, 77]

/**
 * What the hero jersey cycles through: the newest real names and numbers,
 * then "YOUR NAME" invitations showing numbers that are still free.
 * Always at least two faces, so the jersey keeps moving.
 */
export function jerseyFaces(players: RosterPlayer[]): JerseyFace[] {
  const real = latestPlayers(players, 6).map((p) => ({ name: p.jerseyName, number: String(p.jerseyNumber) }))
  const taken = new Set(players.map((p) => p.jerseyNumber))
  const invites = SUGGESTED_NUMBERS.filter((n) => !taken.has(n))
    .slice(0, 3)
    .map((n) => ({ name: 'YOUR NAME', number: String(n) }))
  const faces = [...real, ...invites]
  // Every suggestion taken: fall back to the first free number so there is still a second face.
  if (faces.length < 2) {
    const free = Array.from({ length: 99 }, (_, i) => i + 1).find((n) => !taken.has(n))
    if (free !== undefined) faces.push({ name: 'YOUR NAME', number: String(free) })
  }
  return faces
}
