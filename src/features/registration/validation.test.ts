import { describe, expect, it } from 'vitest'
import { EMPTY_REGISTRATION, type RegistrationData } from './types'
import {
  formatDisplayDate,
  formatWhatsappNumber,
  normalizeFullName,
  normalizeWhatsappNumber,
  sanitizeJerseyNameInput,
  sanitizeJerseyNumberInput,
  sanitizeWhatsappInput,
  toRegistrationPayload,
  validateField,
  validatePhotoFile,
} from './validation'

const TODAY = new Date(2026, 9, 1) // 1 Oct 2026

const photo = (type = 'image/jpeg', size = 200_000) => new File([new Uint8Array(size)], 'me.jpg', { type })

const valid: RegistrationData = {
  fullName: '  Kasun   Perera ',
  dateOfBirth: '2001-04-12',
  village: 'kirinda',
  whatsappNumber: '0771234567',
  playingRole: 'all_rounder',
  battingStyle: 'left',
  playerPhoto: photo(),
  jerseySize: 'L',
  jerseyName: ' kasun ',
  jerseyNumber: '10',
}

const check = (patch: Partial<RegistrationData>, field: keyof RegistrationData) =>
  validateField(field, { ...valid, ...patch }, TODAY)

describe('full name', () => {
  it('requires a non-blank name and trims spaces', () => {
    expect(check({ fullName: '   ' }, 'fullName')).toBe('Please enter your full name.')
    expect(normalizeFullName('  Kasun   Perera ')).toBe('Kasun Perera')
    expect(check({}, 'fullName')).toBeUndefined()
  })

  it('accepts Sinhala/Tamil script and rejects digits', () => {
    expect(check({ fullName: 'කසුන් පෙරේරා' }, 'fullName')).toBeUndefined()
    expect(check({ fullName: "D'Silva-Fernando" }, 'fullName')).toBeUndefined()
    expect(check({ fullName: 'Player 123' }, 'fullName')).toMatch(/letters only/)
  })
})

describe('date of birth', () => {
  it('rejects empty, impossible and future dates', () => {
    expect(check({ dateOfBirth: '' }, 'dateOfBirth')).toBe('Please enter your date of birth.')
    expect(check({ dateOfBirth: '2001-02-30' }, 'dateOfBirth')).toBe('Please enter a valid date.')
    expect(check({ dateOfBirth: '2026-10-02' }, 'dateOfBirth')).toBe('Date of birth cannot be in the future.')
    expect(check({ dateOfBirth: '2026-10-01' }, 'dateOfBirth')).toBeUndefined()
    expect(check({ dateOfBirth: '1900-01-01' }, 'dateOfBirth')).toMatch(/check the year/)
  })

  it('formats as DD/MM/YYYY', () => {
    expect(formatDisplayDate('2001-04-12')).toBe('12/04/2001')
  })
})

describe('predefined options', () => {
  it('only accepts known villages, roles, batting styles and sizes', () => {
    expect(check({ village: 'colombo' as never }, 'village')).toBe('Please select your village.')
    expect(check({ playingRole: 'captain' as never }, 'playingRole')).toBe('Please select your playing role.')
    expect(check({ battingStyle: 'both' as never }, 'battingStyle')).toBe('Please select your batting style.')
    expect(check({ jerseySize: 'XXXXL' as never }, 'jerseySize')).toBe('Please select your jersey size.')
    expect(check({ village: '' }, 'village')).toBe('Please select your village.')
  })
})

describe('WhatsApp number', () => {
  it.each(['771234567', '0771234567', '+94 77 123 4567', '0094771234567', '94-71-234-5678'])('accepts %s', (input) => {
    expect(check({ whatsappNumber: input }, 'whatsappNumber')).toBeUndefined()
  })

  it.each(['', '112345678', '0112345678', '77123456', '7712345678', '791234567'])('rejects "%s"', (input) => {
    expect(check({ whatsappNumber: input }, 'whatsappNumber')).toBeDefined()
  })

  it('normalises and formats', () => {
    expect(normalizeWhatsappNumber('+94 77 123 4567')).toBe('771234567')
    expect(formatWhatsappNumber('0771234567')).toBe('+94 77 123 4567')
  })

  it('sanitises typing and pasting', () => {
    expect(sanitizeWhatsappInput('07a7-12')).toBe('07712')
    expect(sanitizeWhatsappInput('07712345678999')).toBe('771234567')
    expect(sanitizeWhatsappInput('+94771234567')).toBe('771234567')
    expect(sanitizeWhatsappInput('7712345678')).toBe('771234567')
  })
})

describe('photo', () => {
  it('accepts JPG/PNG/WebP under 5 MB', () => {
    expect(validatePhotoFile(photo('image/png'))).toBeUndefined()
    expect(validatePhotoFile(photo('image/webp'))).toBeUndefined()
  })

  it('rejects other types, empty and oversized files', () => {
    expect(validatePhotoFile(new File(['x'], 'cv.pdf', { type: 'application/pdf' }))).toMatch(/JPG, PNG or WebP/)
    expect(validatePhotoFile(photo('image/gif'))).toMatch(/JPG, PNG or WebP/)
    expect(validatePhotoFile(photo('image/jpeg', 0))).toMatch(/empty/)
    expect(validatePhotoFile(photo('image/jpeg', 5 * 1024 * 1024 + 1))).toMatch(/too large/)
  })

  it('is required', () => {
    expect(check({ playerPhoto: null }, 'playerPhoto')).toBe('Please upload your player photo.')
  })
})

describe('jersey number', () => {
  it('requires a number from 1 to 99', () => {
    expect(check({ jerseyNumber: '' }, 'jerseyNumber')).toBe('Please enter a jersey number.')
    expect(check({ jerseyNumber: '0' }, 'jerseyNumber')).toMatch(/1 to 99/)
    expect(check({ jerseyNumber: '-5' }, 'jerseyNumber')).toMatch(/digits only/)
    expect(check({ jerseyNumber: '1' }, 'jerseyNumber')).toBeUndefined()
    expect(check({ jerseyNumber: '99' }, 'jerseyNumber')).toBeUndefined()
  })

  it('strips non-digits while typing', () => {
    expect(sanitizeJerseyNumberInput('-1e2.')).toBe('12')
    expect(sanitizeJerseyNumberInput('100')).toBe('10')
  })
})

describe('name on jersey', () => {
  it('is required, English letters only, max 12 characters', () => {
    expect(check({ jerseyName: '  ' }, 'jerseyName')).toBe('Please enter the name for your jersey.')
    expect(check({ jerseyName: 'PERERA' }, 'jerseyName')).toBeUndefined()
    expect(check({ jerseyName: "D'SILVA" }, 'jerseyName')).toBeUndefined()
    expect(check({ jerseyName: 'පෙරේරා' }, 'jerseyName')).toMatch(/English letters/)
    expect(check({ jerseyName: 'ABCDEFGHIJKLM' }, 'jerseyName')).toMatch(/12 characters/)
  })

  it('uppercases and strips unprintable characters while typing', () => {
    expect(sanitizeJerseyNameInput('kasun')).toBe('KASUN')
    expect(sanitizeJerseyNameInput(' k4s#un  p')).toBe('KSUN P')
    expect(sanitizeJerseyNameInput('abcdefghijklmnop')).toBe('ABCDEFGHIJKL')
  })
})

describe('payload', () => {
  it('returns null while incomplete', () => {
    expect(toRegistrationPayload(EMPTY_REGISTRATION)).toBeNull()
  })

  it('builds a clean payload', () => {
    const payload = toRegistrationPayload(valid)
    expect(payload).toMatchObject({
      fullName: 'Kasun Perera',
      whatsappNumber: '+94771234567',
      jerseyNumber: 10,
      jerseyName: 'KASUN',
      village: 'kirinda',
    })
  })
})
