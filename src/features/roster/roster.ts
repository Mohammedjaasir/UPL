import type { PlayingRole, Village } from '../registration/types'
import type { RosterPlayer } from './rosterService'

export interface RosterQuery {
  search: string
  village: Village | 'all'
  role: PlayingRole | 'all'
}

export const DEFAULT_ROSTER_QUERY: RosterQuery = { search: '', village: 'all', role: 'all' }

/** Name, name on jersey, or jersey number ("7" / "#7"). */
export function filterRoster(players: RosterPlayer[], query: RosterQuery): RosterPlayer[] {
  const q = query.search.trim().toLowerCase()
  const number = /^#?(\d{1,2})$/.exec(q)?.[1]
  return players.filter(
    (p) =>
      (query.village === 'all' || p.village === query.village) &&
      (query.role === 'all' || p.playingRole === query.role) &&
      (!q ||
        p.fullName.toLowerCase().includes(q) ||
        p.jerseyName.toLowerCase().includes(q) ||
        (number !== undefined && String(p.jerseyNumber) === String(Number(number)))),
  )
}
