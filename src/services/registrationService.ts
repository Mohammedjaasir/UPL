import type { SupabaseClient } from '@supabase/supabase-js'
import type { FieldErrors, RegistrationPayload } from '../features/registration/types'
import { getSupabase } from '../lib/supabase'
import { preparePhoto } from './preparePhoto'

/**
 * Saves a player registration to Supabase:
 *   1. the photo goes to the private "player-photos" storage bucket,
 *   2. the details go to the "player_registrations" table.
 * Schema, constraints and RLS policies: supabase/migrations/*_player_registrations.sql
 */

export const PHOTO_BUCKET = 'player-photos'
export const REGISTRATIONS_TABLE = 'player_registrations'

export type RegistrationErrorKind = 'config' | 'network' | 'timeout' | 'conflict' | 'validation' | 'server'

export class RegistrationError extends Error {
  readonly kind: RegistrationErrorKind
  readonly fieldErrors: FieldErrors

  constructor(kind: RegistrationErrorKind, message: string, fieldErrors: FieldErrors = {}) {
    super(message)
    this.name = 'RegistrationError'
    this.kind = kind
    this.fieldErrors = fieldErrors
  }
}

export interface RegistrationResult {
  registrationId: string | null
}

/** Database row, in the table's snake_case column names. */
export interface RegistrationRow {
  id: string
  full_name: string
  date_of_birth: string
  village: string
  whatsapp_number: string
  playing_role: string
  batting_style: string
  jersey_size: string
  jersey_name: string
  jersey_number: number
  photo_path: string
}

/** Minimal error shape shared by Supabase storage and PostgREST errors. */
export interface StoreError {
  message: string
  code?: string
  status?: number
  details?: string
}

/** The two operations the service needs; a Supabase adapter is the real implementation. */
export interface RegistrationStore {
  uploadPhoto(path: string, file: File): Promise<{ error: StoreError | null }>
  insertRegistration(row: RegistrationRow): Promise<{ error: StoreError | null }>
}

export function createSupabaseStore(client: SupabaseClient): RegistrationStore {
  return {
    async uploadPhoto(path, file) {
      const { error } = await client.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' })
      if (!error) return { error: null }
      const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined
      return { error: { message: error.message, status } }
    },
    async insertRegistration(row) {
      // No .select(): anon may insert but not read, so we ask for no row back.
      const { error } = await client.from(REGISTRATIONS_TABLE).insert(row)
      return { error: error ? { message: error.message, code: error.code, details: error.details } : null }
    },
  }
}

export interface SubmitOptions {
  /** Defaults to the configured Supabase project; null means "not configured". */
  store?: RegistrationStore | null
  timeoutMs?: number
  newId?: () => string
  /** Pause before the 2nd attempt; doubles for the 3rd. Tests pass 0. */
  retryDelayMs?: number
}

/** Each network step (photo upload, then the insert) gets this many tries on a dropped connection. */
const ATTEMPTS = 3

const PHOTO_EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** RFC 4122 v4 id. crypto.randomUUID only exists on HTTPS/localhost; getRandomValues works everywhere. */
export function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Short, readable reference shown to the player, e.g. MSL-3F9A1C2B. */
export const toReference = (id: string) => `MSL-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`

export function toRegistrationRow(payload: RegistrationPayload, id: string, photoPath: string): RegistrationRow {
  return {
    id,
    full_name: payload.fullName,
    date_of_birth: payload.dateOfBirth,
    village: payload.village,
    whatsapp_number: payload.whatsappNumber,
    playing_role: payload.playingRole,
    batting_style: payload.battingStyle,
    jersey_size: payload.jerseySize,
    jersey_name: payload.jerseyName,
    jersey_number: payload.jerseyNumber,
    photo_path: photoPath,
  }
}

const NETWORK_MESSAGE = "We couldn't reach the server. Please check your internet connection and try again."
const SERVER_MESSAGE =
  'Something went wrong on our side and your registration was not saved. Please try again in a moment.'

const looksLikeNetworkFailure = (error: StoreError) =>
  /failed to fetch|network|load failed|fetch failed|timed? ?out|aborted/i.test(error.message)

/** A retried upload that finds its own file: the earlier attempt did land. */
const photoAlreadyThere = (error: StoreError) =>
  error.status === 409 || /already exists|duplicate/i.test(error.message)

/** A retried insert that hits its own primary key: the earlier attempt did land. */
const rowAlreadyThere = (error: StoreError) =>
  error.code === '23505' && /\(id\)|_pkey/.test(`${error.message} ${error.details ?? ''}`)

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Run one network step with retries on dropped connections.
 * Returns null on success, or the final StoreError (non-network errors are returned immediately).
 */
async function attempt(
  step: () => Promise<{ error: StoreError | null }>,
  alreadyDone: (error: StoreError) => boolean,
  retryDelayMs: number,
): Promise<StoreError | null> {
  let last: StoreError | null = null
  for (let i = 0; i < ATTEMPTS; i++) {
    if (i > 0) await sleep(retryDelayMs * 2 ** (i - 1))
    let result: { error: StoreError | null }
    try {
      result = await step()
    } catch (e) {
      // supabase-js can throw (rather than return) on a dropped connection.
      result = { error: { message: e instanceof Error ? e.message || 'Failed to fetch' : 'Failed to fetch' } }
    }
    if (!result.error) return null
    if (i > 0 && alreadyDone(result.error)) return null
    last = result.error
    if (!looksLikeNetworkFailure(result.error)) return last
  }
  return last
}

function photoError(error: StoreError): RegistrationError {
  if (looksLikeNetworkFailure(error)) return new RegistrationError('network', NETWORK_MESSAGE)
  if (error.status === 413 || /too large|maximum allowed size/i.test(error.message)) {
    const message = 'This photo is too large for the server. Please choose a smaller photo.'
    return new RegistrationError('validation', message, { playerPhoto: message })
  }
  if (/mime|content type|not supported/i.test(error.message)) {
    const message = 'This photo format was not accepted. Please choose a JPG, PNG or WebP image.'
    return new RegistrationError('validation', message, { playerPhoto: message })
  }
  return new RegistrationError('server', SERVER_MESSAGE)
}

function insertError(error: StoreError, payload: RegistrationPayload): RegistrationError {
  if (looksLikeNetworkFailure(error)) return new RegistrationError('network', NETWORK_MESSAGE)
  const text = `${error.message} ${error.details ?? ''}`
  if (error.code === '23505' && /jersey_number/.test(text)) {
    const message = `Jersey number ${payload.jerseyNumber} is already taken. Please choose another.`
    return new RegistrationError('conflict', message, { jerseyNumber: message })
  }
  if (error.code === '23514' || error.code === '22P02' || error.code === '22007') {
    return new RegistrationError('validation', 'Some details were not accepted. Please check your details and try again.')
  }
  return new RegistrationError('server', SERVER_MESSAGE)
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new RegistrationError('timeout', 'The request took too long. Please check your connection and try again.')),
      ms,
    )
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export async function submitRegistration(
  payload: RegistrationPayload,
  { store, timeoutMs = 120_000, newId = generateId, retryDelayMs = 1500 }: SubmitOptions = {},
): Promise<RegistrationResult> {
  const resolvedStore = store === undefined ? defaultStore() : store
  if (!resolvedStore) {
    throw new RegistrationError('config', 'Registration is not open online yet. Please contact the league organisers.')
  }

  const id = newId()

  const run = async () => {
    // Shrunk on the phone first: small uploads survive weak mobile connections.
    const photo = await preparePhoto(payload.playerPhoto)
    const photoPath = `${id}.${PHOTO_EXTENSIONS[photo.type] ?? 'jpg'}`

    const uploadError = await attempt(() => resolvedStore.uploadPhoto(photoPath, photo), photoAlreadyThere, retryDelayMs)
    if (uploadError) throw photoError(uploadError)

    const row = toRegistrationRow(payload, id, photoPath)
    const insertErr = await attempt(() => resolvedStore.insertRegistration(row), rowAlreadyThere, retryDelayMs)
    if (insertErr) throw insertError(insertErr, payload)

    return { registrationId: toReference(id) }
  }

  try {
    return await withTimeout(run(), timeoutMs)
  } catch (error) {
    if (error instanceof RegistrationError) throw error
    // supabase-js can also throw (rather than return) on a dropped connection.
    throw new RegistrationError('network', NETWORK_MESSAGE)
  }
}

function defaultStore(): RegistrationStore | null {
  const client = getSupabase()
  return client ? createSupabaseStore(client) : null
}
