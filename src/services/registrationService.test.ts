import { describe, expect, it, vi } from 'vitest'
import type { RegistrationPayload } from '../features/registration/types'
import {
  generateId,
  RegistrationError,
  submitRegistration,
  toReference,
  type RegistrationRow,
  type RegistrationStore,
  type StoreError,
} from './registrationService'

const payload: RegistrationPayload = {
  fullName: 'Kasun Perera',
  dateOfBirth: '2001-04-12',
  village: 'miella',
  whatsappNumber: '+94771234567',
  playingRole: 'bowler',
  battingStyle: 'right',
  playerPhoto: new File(['img'], 'me.png', { type: 'image/png' }),
  jerseySize: 'M',
  jerseyName: 'PERERA',
  jerseyNumber: 7,
}

const ID = '3f9a1c2b-0000-4000-8000-000000000000'

function fakeStore(
  overrides: { upload?: StoreError | null | Error; insert?: StoreError | null | Error } = {},
) {
  const uploads: Array<{ path: string; file: File }> = []
  const rows: RegistrationRow[] = []
  const store: RegistrationStore = {
    uploadPhoto: vi.fn(async (path: string, file: File) => {
      if (overrides.upload instanceof Error) throw overrides.upload
      uploads.push({ path, file })
      return { error: overrides.upload ?? null }
    }),
    insertRegistration: vi.fn(async (row: RegistrationRow) => {
      if (overrides.insert instanceof Error) throw overrides.insert
      rows.push(row)
      return { error: overrides.insert ?? null }
    }),
  }
  return { store, uploads, rows }
}

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

const submit = (store: RegistrationStore | null, timeoutMs?: number) =>
  submitRegistration(payload, { store, newId: () => ID, timeoutMs })

describe('submitRegistration (Supabase)', () => {
  it('refuses to pretend success when Supabase is not configured', async () => {
    const error = await failure(submit(null))
    expect(error.kind).toBe('config')
  })

  it('uploads the photo, then inserts a snake_case row that points at it', async () => {
    const { store, uploads, rows } = fakeStore()
    const result = await submit(store)

    expect(result).toEqual({ registrationId: 'MSL-3F9A1C2B' })
    expect(uploads).toEqual([{ path: `${ID}.png`, file: payload.playerPhoto }])
    expect(rows).toEqual([
      {
        id: ID,
        full_name: 'Kasun Perera',
        date_of_birth: '2001-04-12',
        village: 'miella',
        whatsapp_number: '+94771234567',
        playing_role: 'bowler',
        batting_style: 'right',
        jersey_size: 'M',
        jersey_name: 'PERERA',
        jersey_number: 7,
        photo_path: `${ID}.png`,
      },
    ])
  })

  it('does not insert a row when the photo upload fails', async () => {
    const { store, rows } = fakeStore({ upload: { message: 'Internal error', status: 500 } })
    const error = await failure(submit(store))
    expect(error.kind).toBe('server')
    expect(rows).toHaveLength(0)
  })

  it('maps an oversized photo to the photo field', async () => {
    const { store } = fakeStore({ upload: { message: 'The object exceeded the maximum allowed size', status: 413 } })
    const error = await failure(submit(store))
    expect(error.fieldErrors.playerPhoto).toMatch(/too large/)
  })

  it('maps a unique-violation on jersey_number to a duplicate jersey error', async () => {
    const { store } = fakeStore({
      insert: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "player_registrations_jersey_number_key"',
        details: 'Key (jersey_number)=(7) already exists.',
      },
    })
    const error = await failure(submit(store))
    expect(error.kind).toBe('conflict')
    expect(error.fieldErrors.jerseyNumber).toBe('Jersey number 7 is already taken. Please choose another.')
  })

  it('maps check-constraint failures to a validation error', async () => {
    const { store } = fakeStore({ insert: { code: '23514', message: 'violates check constraint' } })
    expect((await failure(submit(store))).kind).toBe('validation')
  })

  it('reports permission / unknown database errors without claiming success', async () => {
    const { store } = fakeStore({ insert: { code: '42501', message: 'new row violates row-level security policy' } })
    const error = await failure(submit(store))
    expect(error.kind).toBe('server')
    expect(error.message).toMatch(/not saved/)
  })

  it('reports network failures, whether returned or thrown', async () => {
    const returned = fakeStore({ upload: { message: 'TypeError: Failed to fetch' } })
    expect((await failure(submit(returned.store))).kind).toBe('network')

    const thrown = fakeStore({ insert: new TypeError('Load failed') })
    expect((await failure(submit(thrown.store))).kind).toBe('network')
  })

  it('times out slow requests', async () => {
    const store: RegistrationStore = {
      uploadPhoto: () => new Promise(() => {}),
      insertRegistration: vi.fn(),
    }
    const error = await failure(submit(store, 10))
    expect(error.kind).toBe('timeout')
    expect(store.insertRegistration).not.toHaveBeenCalled()
  })
})

describe('ids', () => {
  it('generates RFC 4122 v4 ids without crypto.randomUUID', () => {
    const id = generateId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(generateId()).not.toBe(id)
  })

  it('builds a short reference', () => {
    expect(toReference(ID)).toBe('MSL-3F9A1C2B')
  })
})
