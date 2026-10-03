import type { SupabaseClient } from '@supabase/supabase-js'
import { getAdminSupabase } from '../../lib/supabase'
import { PHOTO_BUCKET, REGISTRATIONS_TABLE } from '../../services/registrationService'
import { fromRow, type Player, type PlayerRow } from './players'

/** Signed photo links last an hour; the dashboard refetches well within that. */
const PHOTO_LINK_SECONDS = 60 * 60

export interface Organiser {
  email: string
}

export class AdminError extends Error {
  readonly kind: 'config' | 'auth' | 'network' | 'server'
  constructor(kind: AdminError['kind'], message: string) {
    super(message)
    this.name = 'AdminError'
    this.kind = kind
  }
}

/** Everything the dashboard needs from the backend. A Supabase adapter is the real one. */
export interface AdminService {
  currentOrganiser(): Promise<Organiser | null>
  onSignOut(listener: () => void): () => void
  signIn(email: string, password: string): Promise<Organiser>
  signOut(): Promise<void>
  /** false = signed in, but not on the organiser list. */
  isOrganiser(): Promise<boolean>
  listPlayers(): Promise<Player[]>
  /** Removes the registration (freeing its jersey number) and then its photo. */
  deletePlayer(player: Pick<Player, 'id' | 'photoPath'>): Promise<void>
}

const isNetworkError = (message: string) => /failed to fetch|network|load failed|fetch failed/i.test(message)

function toAdminError(message: string): AdminError {
  return isNetworkError(message)
    ? new AdminError('network', "We couldn't reach the server. Check your internet connection and try again.")
    : new AdminError('server', `The server returned an error: ${message}`)
}

export function createSupabaseAdminService(client: SupabaseClient): AdminService {
  return {
    async currentOrganiser() {
      const { data } = await client.auth.getSession()
      const email = data.session?.user.email
      return email ? { email } : null
    },

    onSignOut(listener) {
      const { data } = client.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') listener()
      })
      return () => data.subscription.unsubscribe()
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        if (isNetworkError(error.message)) throw toAdminError(error.message)
        throw new AdminError('auth', 'That email and password did not match an organiser account.')
      }
      return { email: data.user.email ?? email.trim() }
    },

    async signOut() {
      await client.auth.signOut()
    },

    async isOrganiser() {
      const { data, error } = await client.rpc('is_organiser')
      if (error) throw toAdminError(error.message)
      return data === true
    },

    async listPlayers() {
      const { data, error } = await client
        .from(REGISTRATIONS_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw toAdminError(error.message)
      const rows = (data ?? []) as PlayerRow[]
      if (rows.length === 0) return []

      const { data: links, error: linkError } = await client.storage
        .from(PHOTO_BUCKET)
        .createSignedUrls(
          rows.map((r) => r.photo_path),
          PHOTO_LINK_SECONDS,
        )
      // Photos are a nice-to-have here: show the list even if signing fails.
      const urlByPath = new Map<string, string>()
      if (!linkError) for (const l of links ?? []) if (l.path && l.signedUrl) urlByPath.set(l.path, l.signedUrl)
      return rows.map((r) => fromRow(r, urlByPath.get(r.photo_path) ?? null))
    },

    async deletePlayer(player) {
      // Row first: a leftover private photo is harmless, a row pointing at a missing photo is not.
      // .select() returns what was deleted, because RLS silently deletes nothing when not allowed.
      const { data, error } = await client.from(REGISTRATIONS_TABLE).delete().eq('id', player.id).select('id')
      if (error) throw toAdminError(error.message)
      if (!data || data.length === 0) {
        throw new AdminError(
          'server',
          'This registration was not deleted. It may already be gone, or your account cannot delete yet (run the organiser delete SQL).',
        )
      }
      // Best effort: the registration is already gone either way.
      await client.storage.from(PHOTO_BUCKET).remove([player.photoPath])
    },
  }
}

/** The real service, or null when Supabase keys are missing from the build. */
export function getDefaultAdminService(): AdminService | null {
  const client = getAdminSupabase()
  return client ? createSupabaseAdminService(client) : null
}
