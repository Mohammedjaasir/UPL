import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null | undefined
let adminClient: SupabaseClient | null | undefined

function config() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  return url && anonKey ? { url, anonKey } : null
}

/**
 * Shared Supabase client, or null when the project keys are not configured.
 * The registration site never signs anyone in, so session storage/refresh is switched off.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client
  const c = config()
  client = c ? createClient(c.url, c.anonKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null
  return client
}

/**
 * Client for the organiser dashboard (/admin). Keeps the organiser signed in across reloads.
 * Only ever created on the /admin route, so it never coexists with the registration client.
 */
export function getAdminSupabase(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient
  const c = config()
  adminClient = c
    ? createClient(c.url, c.anonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'msl-organiser-auth' } })
    : null
  return adminClient
}
