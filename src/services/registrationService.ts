import type { FieldErrors, FieldName, RegistrationPayload } from '../features/registration/types'

/**
 * Player registration API client.
 *
 * Contract (POST, multipart/form-data) — see README "Backend contract":
 *   fields: fullName, dateOfBirth, village, whatsappNumber, playingRole,
 *           battingStyle, jerseySize, jerseyName, jerseyNumber, playerPhoto (file)
 *   2xx   → { id?: string, registrationId?: string }
 *   409   → { field?: FieldName, message?: string }      (e.g. jersey number taken)
 *   400/422 → { message?: string, errors?: { [field]: string } }
 */

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

export interface SubmitOptions {
  endpoint?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

const KNOWN_FIELDS: readonly FieldName[] = [
  'fullName',
  'dateOfBirth',
  'village',
  'whatsappNumber',
  'playingRole',
  'battingStyle',
  'playerPhoto',
  'jerseySize',
  'jerseyName',
  'jerseyNumber',
]

const isKnownField = (value: unknown): value is FieldName =>
  typeof value === 'string' && (KNOWN_FIELDS as readonly string[]).includes(value)

export function buildRegistrationFormData(payload: RegistrationPayload): FormData {
  const form = new FormData()
  form.append('fullName', payload.fullName)
  form.append('dateOfBirth', payload.dateOfBirth)
  form.append('village', payload.village)
  form.append('whatsappNumber', payload.whatsappNumber)
  form.append('playingRole', payload.playingRole)
  form.append('battingStyle', payload.battingStyle)
  form.append('jerseySize', payload.jerseySize)
  form.append('jerseyName', payload.jerseyName)
  form.append('jerseyNumber', String(payload.jerseyNumber))
  form.append('playerPhoto', payload.playerPhoto, payload.playerPhoto.name)
  return form
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function pickFieldErrors(body: Record<string, unknown>): FieldErrors {
  const errors: FieldErrors = {}
  const raw = body.errors
  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (isKnownField(key) && typeof value === 'string') errors[key] = value
    }
  }
  return errors
}

export async function submitRegistration(
  payload: RegistrationPayload,
  {
    endpoint = import.meta.env.VITE_REGISTRATION_API_URL,
    fetchImpl = globalThis.fetch.bind(globalThis),
    timeoutMs = 30_000,
  }: SubmitOptions = {},
): Promise<RegistrationResult> {
  if (!endpoint) {
    throw new RegistrationError(
      'config',
      'Registration is not open online yet. Please contact the league organisers.',
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      body: buildRegistrationFormData(payload),
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
  } catch {
    if (controller.signal.aborted) {
      throw new RegistrationError('timeout', 'The request took too long. Please check your connection and try again.')
    }
    throw new RegistrationError(
      'network',
      "We couldn't reach the server. Please check your internet connection and try again.",
    )
  } finally {
    clearTimeout(timer)
  }

  if (response.ok) {
    const body = await readJson(response)
    const id = body.registrationId ?? body.id
    return { registrationId: typeof id === 'string' || typeof id === 'number' ? String(id) : null }
  }

  const body = await readJson(response)
  const message = typeof body.message === 'string' ? body.message : undefined

  if (response.status === 409) {
    const field = isKnownField(body.field) ? body.field : 'jerseyNumber'
    const fieldMessage =
      message ??
      (field === 'jerseyNumber'
        ? `Jersey number ${payload.jerseyNumber} is already taken. Please choose another.`
        : 'This player appears to be registered already.')
    throw new RegistrationError('conflict', fieldMessage, { [field]: fieldMessage })
  }

  if (response.status === 413) {
    const photoMessage = 'This photo is too large for the server. Please choose a smaller photo.'
    throw new RegistrationError('validation', photoMessage, { playerPhoto: photoMessage })
  }

  if (response.status === 400 || response.status === 422) {
    throw new RegistrationError(
      'validation',
      message ?? 'Some details were not accepted. Please check the highlighted fields.',
      pickFieldErrors(body),
    )
  }

  throw new RegistrationError(
    'server',
    'Something went wrong on our side and your registration was not saved. Please try again in a moment.',
  )
}
