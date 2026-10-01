import {
  BATTING_STYLES,
  DOB_MIN,
  JERSEY_NUMBER_MAX,
  JERSEY_NUMBER_MIN,
  JERSEY_SIZES,
  NAME_MAX_LENGTH,
  PHOTO_ACCEPTED_TYPES,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_MB,
  PLAYING_ROLES,
  VILLAGES,
} from './constants'
import type { FieldErrors, FieldName, RegistrationData, RegistrationPayload } from './types'

type Option = { readonly value: string; readonly label: string }

const isOption = <T extends Option>(options: readonly T[], value: string): value is T['value'] =>
  options.some((option) => option.value === value)

export function labelFor(options: readonly Option[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value
}

/* ---------- Normalisers ---------- */

export function normalizeFullName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/**
 * Reduce whatever the player typed or pasted ("077 123 4567", "+94 77 123 4567",
 * "0094771234567") to the 9 national digits, e.g. "771234567".
 */
export function normalizeWhatsappNumber(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('0094')) digits = digits.slice(4)
  else if (digits.startsWith('94') && digits.length > 9) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits
}

/** Keep only characters that can belong to a phone number while typing. */
export function sanitizeWhatsappInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  // A pasted international number collapses to national digits straight away.
  if (digits.length > 10 || (digits.startsWith('94') && digits.length > 9)) {
    return normalizeWhatsappNumber(digits).slice(0, 9)
  }
  return digits.slice(0, digits.startsWith('0') ? 10 : 9)
}

/** Sri Lankan mobile numbers: 7X XXX XXXX (070–078). */
export function isValidSriLankanMobile(nationalDigits: string): boolean {
  return /^7[0-8]\d{7}$/.test(nationalDigits)
}

export function formatWhatsappNumber(value: string): string {
  const d = normalizeWhatsappNumber(value)
  if (d.length !== 9) return `+94 ${d}`
  return `+94 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`
}

export function sanitizeJerseyNumberInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 2)
}

/** "07" → "7" so the stored number matches what is printed on the shirt. */
export function normalizeJerseyNumber(value: string): string {
  return /^\d+$/.test(value) ? String(Number(value)) : value
}

/* ---------- Dates ---------- */

export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isRealIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

export function formatDisplayDate(iso: string): string {
  if (!isRealIsoDate(iso)) return iso
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/* ---------- Photo ---------- */

export function validatePhotoFile(file: File): string | undefined {
  if (!(PHOTO_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return 'Please choose a JPG, PNG or WebP image.'
  }
  if (file.size === 0) return 'This file appears to be empty. Please choose another photo.'
  if (file.size > PHOTO_MAX_BYTES) {
    return `This photo is too large. Please choose one under ${PHOTO_MAX_MB} MB.`
  }
  return undefined
}

/* ---------- Field validation ---------- */

type Validator = (data: RegistrationData, today: Date) => string | undefined

const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u

const validators: Record<FieldName, Validator> = {
  fullName: ({ fullName }) => {
    const name = normalizeFullName(fullName)
    if (!name) return 'Please enter your full name.'
    if (name.length < 2) return 'Your name looks too short.'
    if (name.length > NAME_MAX_LENGTH) return `Please keep your name under ${NAME_MAX_LENGTH} characters.`
    if (!NAME_PATTERN.test(name)) return 'Please use letters only in your name.'
    return undefined
  },
  dateOfBirth: ({ dateOfBirth }, today) => {
    if (!dateOfBirth) return 'Please enter your date of birth.'
    if (!isRealIsoDate(dateOfBirth)) return 'Please enter a valid date.'
    if (dateOfBirth > toIsoDate(today)) return 'Date of birth cannot be in the future.'
    if (dateOfBirth < DOB_MIN) return 'Please check the year of your date of birth.'
    return undefined
  },
  village: ({ village }) => (isOption(VILLAGES, village) ? undefined : 'Please select your village.'),
  whatsappNumber: ({ whatsappNumber }) => {
    if (!whatsappNumber.trim()) return 'Please enter your WhatsApp number.'
    return isValidSriLankanMobile(normalizeWhatsappNumber(whatsappNumber))
      ? undefined
      : 'Please enter a valid WhatsApp number.'
  },
  playingRole: ({ playingRole }) =>
    isOption(PLAYING_ROLES, playingRole) ? undefined : 'Please select your playing role.',
  battingStyle: ({ battingStyle }) =>
    isOption(BATTING_STYLES, battingStyle) ? undefined : 'Please select your batting style.',
  playerPhoto: ({ playerPhoto }) =>
    playerPhoto ? validatePhotoFile(playerPhoto) : 'Please upload your player photo.',
  jerseySize: ({ jerseySize }) =>
    isOption(JERSEY_SIZES, jerseySize) ? undefined : 'Please select your jersey size.',
  jerseyNumber: ({ jerseyNumber }) => {
    if (!jerseyNumber) return 'Please enter a jersey number.'
    if (!/^\d+$/.test(jerseyNumber)) return 'Jersey number must be digits only.'
    const n = Number(jerseyNumber)
    if (n < JERSEY_NUMBER_MIN || n > JERSEY_NUMBER_MAX) {
      return `Choose a number from ${JERSEY_NUMBER_MIN} to ${JERSEY_NUMBER_MAX}.`
    }
    return undefined
  },
}

export const ALL_FIELDS = Object.keys(validators) as FieldName[]

export function validateField(field: FieldName, data: RegistrationData, today = new Date()): string | undefined {
  return validators[field](data, today)
}

export function validateFields(
  fields: readonly FieldName[],
  data: RegistrationData,
  today = new Date(),
): FieldErrors {
  const errors: FieldErrors = {}
  for (const field of fields) {
    const error = validateField(field, data, today)
    if (error) errors[field] = error
  }
  return errors
}

/** Returns the clean payload, or null while anything is still invalid. */
export function toRegistrationPayload(data: RegistrationData): RegistrationPayload | null {
  if (Object.keys(validateFields(ALL_FIELDS, data)).length > 0) return null
  return {
    fullName: normalizeFullName(data.fullName),
    dateOfBirth: data.dateOfBirth,
    village: data.village as RegistrationPayload['village'],
    whatsappNumber: `+94${normalizeWhatsappNumber(data.whatsappNumber)}`,
    playingRole: data.playingRole as RegistrationPayload['playingRole'],
    battingStyle: data.battingStyle as RegistrationPayload['battingStyle'],
    playerPhoto: data.playerPhoto as File,
    jerseySize: data.jerseySize as RegistrationPayload['jerseySize'],
    jerseyNumber: Number(data.jerseyNumber),
  }
}
