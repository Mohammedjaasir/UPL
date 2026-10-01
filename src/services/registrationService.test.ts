import { describe, expect, it, vi } from 'vitest'
import type { RegistrationPayload } from '../features/registration/types'
import { RegistrationError, submitRegistration } from './registrationService'

const payload: RegistrationPayload = {
  fullName: 'Kasun Perera',
  dateOfBirth: '2001-04-12',
  village: 'miella',
  whatsappNumber: '+94771234567',
  playingRole: 'bowler',
  battingStyle: 'right',
  playerPhoto: new File(['img'], 'me.jpg', { type: 'image/jpeg' }),
  jerseySize: 'M',
  jerseyName: 'PERERA',
  jerseyNumber: 7,
}

const endpoint = 'https://api.test/registrations'
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

async function failure(promise: Promise<unknown>): Promise<RegistrationError> {
  const error = await promise.then(
    () => {
      throw new Error('expected submission to fail')
    },
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(RegistrationError)
  return error as RegistrationError
}

describe('submitRegistration', () => {
  it('refuses to pretend success when no endpoint is configured', async () => {
    const fetchImpl = vi.fn()
    const error = await failure(submitRegistration(payload, { endpoint: '', fetchImpl }))
    expect(error.kind).toBe('config')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('posts multipart form data and returns the registration id', async () => {
    const fetchImpl = vi.fn(async () => json(201, { registrationId: 'MSL-0042' }))
    const result = await submitRegistration(payload, { endpoint, fetchImpl })

    expect(result).toEqual({ registrationId: 'MSL-0042' })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(endpoint)
    expect(init.method).toBe('POST')
    const body = init.body as FormData
    expect(body.get('whatsappNumber')).toBe('+94771234567')
    expect(body.get('jerseyNumber')).toBe('7')
    expect(body.get('jerseyName')).toBe('PERERA')
    expect(body.get('village')).toBe('miella')
    expect(body.get('playerPhoto')).toBeInstanceOf(File)
  })

  it('accepts an empty success body', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))
    await expect(submitRegistration(payload, { endpoint, fetchImpl })).resolves.toEqual({ registrationId: null })
  })

  it('maps 409 to a duplicate jersey number error on the field', async () => {
    const fetchImpl = vi.fn(async () => json(409, { field: 'jerseyNumber' }))
    const error = await failure(submitRegistration(payload, { endpoint, fetchImpl }))
    expect(error.kind).toBe('conflict')
    expect(error.fieldErrors.jerseyNumber).toMatch(/Jersey number 7 is already taken/)
  })

  it('maps 422 field errors and ignores unknown fields', async () => {
    const fetchImpl = vi.fn(async () =>
      json(422, { message: 'Invalid', errors: { whatsappNumber: 'Number already registered', foo: 'x' } }),
    )
    const error = await failure(submitRegistration(payload, { endpoint, fetchImpl }))
    expect(error.kind).toBe('validation')
    expect(error.fieldErrors).toEqual({ whatsappNumber: 'Number already registered' })
  })

  it('maps 413 to a photo error', async () => {
    const fetchImpl = vi.fn(async () => new Response('too big', { status: 413 }))
    const error = await failure(submitRegistration(payload, { endpoint, fetchImpl }))
    expect(error.fieldErrors.playerPhoto).toMatch(/too large/)
  })

  it('reports server errors without claiming success', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>', { status: 500 }))
    const error = await failure(submitRegistration(payload, { endpoint, fetchImpl }))
    expect(error.kind).toBe('server')
    expect(error.message).toMatch(/not saved/)
  })

  it('reports network failures', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const error = await failure(submitRegistration(payload, { endpoint, fetchImpl }))
    expect(error.kind).toBe('network')
  })

  it('times out slow requests', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )
    const error = await failure(submitRegistration(payload, { endpoint, fetchImpl: fetchImpl as typeof fetch, timeoutMs: 10 }))
    expect(error.kind).toBe('timeout')
  })
})
