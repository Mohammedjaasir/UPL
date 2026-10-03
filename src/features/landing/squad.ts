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

/** What the hero jersey cycles through: real names when there are players, an invitation otherwise. */
export function jerseyFaces(players: RosterPlayer[]): JerseyFace[] {
  const real = latestPlayers(players, 6).map((p) => ({ name: p.jerseyName, number: String(p.jerseyNumber) }))
  return real.length > 0 ? real : [{ name: 'YOUR NAME', number: '10' }]
}
