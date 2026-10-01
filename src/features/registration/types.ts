import type { BATTING_STYLES, JERSEY_SIZES, PLAYING_ROLES, VILLAGES } from './constants'

export type Village = (typeof VILLAGES)[number]['value']
export type PlayingRole = (typeof PLAYING_ROLES)[number]['value']
export type BattingStyle = (typeof BATTING_STYLES)[number]['value']
export type JerseySize = (typeof JERSEY_SIZES)[number]['value']

/** Raw form state, exactly as the player has entered it. */
export interface RegistrationData {
  fullName: string
  /** ISO date (YYYY-MM-DD) as produced by the native date input. */
  dateOfBirth: string
  village: Village | ''
  /** National digits as typed (may include a leading 0); normalised on submit. */
  whatsappNumber: string
  playingRole: PlayingRole | ''
  battingStyle: BattingStyle | ''
  playerPhoto: File | null
  jerseySize: JerseySize | ''
  /** Printed on the back of the shirt; stored uppercase. */
  jerseyName: string
  jerseyNumber: string
}

export type FieldName = keyof RegistrationData
export type FieldErrors = Partial<Record<FieldName, string>>

/** Clean, validated data handed to the submission service. */
export interface RegistrationPayload {
  fullName: string
  dateOfBirth: string
  village: Village
  /** E.164, e.g. +94771234567 */
  whatsappNumber: string
  playingRole: PlayingRole
  battingStyle: BattingStyle
  playerPhoto: File
  jerseySize: JerseySize
  jerseyName: string
  jerseyNumber: number
}

export const EMPTY_REGISTRATION: RegistrationData = {
  fullName: '',
  dateOfBirth: '',
  village: '',
  whatsappNumber: '',
  playingRole: '',
  battingStyle: '',
  playerPhoto: null,
  jerseySize: '',
  jerseyName: '',
  jerseyNumber: '',
}
