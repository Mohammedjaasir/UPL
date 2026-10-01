export const VILLAGES = [
  { value: 'miella', label: 'Miella' },
  { value: 'kirinda', label: 'Kirinda' },
  { value: 'yagasmulla', label: 'Yagasmulla' },
] as const

export const PLAYING_ROLES = [
  { value: 'batsman', label: 'Batsman' },
  { value: 'bowler', label: 'Bowler' },
  { value: 'all_rounder', label: 'All-rounder' },
  { value: 'wicket_keeper', label: 'Wicket Keeper' },
] as const

export const BATTING_STYLES = [
  { value: 'right', label: 'Right Hand' },
  { value: 'left', label: 'Left Hand' },
] as const

export const JERSEY_SIZES = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
  { value: 'XXL', label: 'XXL' },
  { value: 'XXXL', label: 'XXXL' },
] as const

export const JERSEY_NUMBER_MIN = 1
export const JERSEY_NUMBER_MAX = 99

export const NAME_MAX_LENGTH = 60
export const DOB_MIN = '1940-01-01'

export const PHOTO_MAX_MB = 5
export const PHOTO_MAX_BYTES = PHOTO_MAX_MB * 1024 * 1024
export const PHOTO_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const WHATSAPP_COUNTRY_CODE = '+94'
