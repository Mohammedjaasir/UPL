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

/** Popular shirt numbers shown on the invitation faces. */
const SUGGESTED_NUMBERS = [10, 7, 23]

/**
 * What the hero jersey cycles through: the newest real names and numbers,
 * then "YOUR NAME" invitations with popular numbers (any number can be chosen).
 */
export function jerseyFaces(players: RosterPlayer[]): JerseyFace[] {
  const real = latestPlayers(players, 6).map((p) => ({ name: p.jerseyName, number: String(p.jerseyNumber) }))
  return [...real, ...SUGGESTED_NUMBERS.map((n) => ({ name: 'YOUR NAME', number: String(n) }))]
}
