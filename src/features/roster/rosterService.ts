import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '../../lib/supabase'
import { PHOTO_BUCKET } from '../../services/registrationService'
import type { BattingStyle, PlayingRole, Village } from '../registration/types'

/** What the public list may show. No phone number, date of birth or jersey size. */
export interface RosterPlayer {
  id: string
  fullName: string
  village: Village
  playingRole: PlayingRole
  battingStyle: BattingStyle
  jerseyName: string
  jerseyNumber: number
  photoUrl: string | null
  /** ISO timestamp of registration. */
  createdAt: string
}

interface RosterRow {
  id: string
  full_name: string
  village: string
  playing_role: string
  batting_style: string
  jersey_name: string
  jersey_number: number
  photo_path: string | null
  created_at: string
}

export class RosterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RosterError'
  }
}

export interface RosterService {
  listPlayers(): Promise<RosterPlayer[]>
}

export function createSupabaseRosterService(client: SupabaseClient): RosterService {
  return {
    async listPlayers() {
      const { data, error } = await client.rpc('get_public_roster')
      if (error) {
        throw new RosterError(
          /failed to fetch|network|load failed/i.test(error.message)
            ? "We couldn't reach the server. Check your internet connection and try again."
            : 'The player list is not available right now. Please try again later.',
        )
      }
      return ((data ?? []) as RosterRow[]).map((r) => ({
        id: r.id,
        fullName: r.full_name,
        village: r.village as Village,
        playingRole: r.playing_role as PlayingRole,
        battingStyle: r.batting_style as BattingStyle,
        jerseyName: r.jersey_name,
        jerseyNumber: r.jersey_number,
        createdAt: r.created_at,
        photoUrl: r.photo_path ? client.storage.from(PHOTO_BUCKET).getPublicUrl(r.photo_path).data.publicUrl : null,
      }))
    },
  }
}

export function getDefaultRosterService(): RosterService | null {
  const client = getSupabase()
  return client ? createSupabaseRosterService(client) : null
}
