import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null | undefined

/**
 * Shared Supabase client, or null when the project keys are not configured.
 * The site never signs anyone in, so session storage/refresh is switched off.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  client =
    url && anonKey
      ? createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : null
  return client
}
