import { BATTING_STYLES, JERSEY_SIZES, PLAYING_ROLES, VILLAGES } from '../registration/constants'
import type { BattingStyle, JerseySize, PlayingRole, Village } from '../registration/types'
import { formatDisplayDate, formatWhatsappNumber, labelFor } from '../registration/validation'

/** A registration as the dashboard shows it (camelCase, with a signed photo link). */
export interface Player {
  id: string
  createdAt: string
  fullName: string
  dateOfBirth: string
  village: Village
  whatsappNumber: string
  playingRole: PlayingRole
  battingStyle: BattingStyle
  jerseySize: JerseySize
  jerseyName: string
  jerseyNumber: number
  photoPath: string
  photoUrl: string | null
}

/** Row as returned by `select *` on public.player_registrations. */
export interface PlayerRow {
  id: string
  created_at: string
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

export function fromRow(row: PlayerRow, photoUrl: string | null = null): Player {
  return {
    id: row.id,
    createdAt: row.created_at,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    village: row.village as Village,
    whatsappNumber: row.whatsapp_number,
    playingRole: row.playing_role as PlayingRole,
    battingStyle: row.batting_style as BattingStyle,
    jerseySize: row.jersey_size as JerseySize,
    jerseyName: row.jersey_name,
    jerseyNumber: row.jersey_number,
    photoPath: row.photo_path,
    photoUrl,
  }
}

/* ---------- Display helpers ---------- */

export const villageLabel = (v: string) => labelFor(VILLAGES, v)
export const roleLabel = (v: string) => labelFor(PLAYING_ROLES, v)
export const battingLabel = (v: string) => labelFor(BATTING_STYLES, v)
export const displayDate = formatDisplayDate
export const displayWhatsapp = formatWhatsappNumber

/** wa.me wants digits only, country code first. */
export function whatsappLink(e164: string): string {
  return `https://wa.me/${e164.replace(/\D/g, '')}`
}

/** Whole years on `today`, from an ISO date. */
export function ageOn(dateOfBirth: string, today = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age -= 1
  return age
}

export function displayRegisteredAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/* ---------- Summary ---------- */

export interface Breakdown {
  value: string
  label: string
  count: number
}

function countBy<T extends { value: string; label: string }>(
  options: readonly T[],
  players: Player[],
  key: (p: Player) => string,
): Breakdown[] {
  return options.map((o) => ({ value: o.value, label: o.label, count: players.filter((p) => key(p) === o.value).length }))
}

export function summarize(players: Player[]) {
  return {
    total: players.length,
    villages: countBy(VILLAGES, players, (p) => p.village),
    roles: countBy(PLAYING_ROLES, players, (p) => p.playingRole),
    sizes: countBy(JERSEY_SIZES, players, (p) => p.jerseySize),
  }
}

/* ---------- Search, filter, sort ---------- */

export type SortKey = 'newest' | 'oldest' | 'name' | 'number'

export interface PlayerQuery {
  search: string
  village: Village | 'all'
  role: PlayingRole | 'all'
  sort: SortKey
}

export const DEFAULT_QUERY: PlayerQuery = { search: '', village: 'all', role: 'all', sort: 'newest' }

export function matchesSearch(p: Player, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  const digits = q.replace(/\D/g, '')
  const haystack = [p.fullName, p.jerseyName, villageLabel(p.village), roleLabel(p.playingRole)].join(' ').toLowerCase()
  if (haystack.includes(q)) return true
  if (/^#?\d{1,2}$/.test(q) && String(p.jerseyNumber) === digits) return true
  // Phone search: "0771234567", "77 123", "+94 77..." all match by digits.
  if (digits.length >= 3) {
    const national = p.whatsappNumber.replace(/\D/g, '').replace(/^94/, '')
    return national.includes(digits.replace(/^(94|0)/, ''))
  }
  return false
}

export function queryPlayers(players: Player[], query: PlayerQuery): Player[] {
  const filtered = players.filter(
    (p) =>
      (query.village === 'all' || p.village === query.village) &&
      (query.role === 'all' || p.playingRole === query.role) &&
      matchesSearch(p, query.search),
  )
  const sorted = [...filtered]
  switch (query.sort) {
    case 'newest':
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      break
    case 'oldest':
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      break
    case 'name':
      sorted.sort((a, b) => a.fullName.localeCompare(b.fullName))
      break
    case 'number':
      sorted.sort((a, b) => a.jerseyNumber - b.jerseyNumber)
      break
  }
  return sorted
}

/* ---------- CSV export ---------- */

const CSV_COLUMNS: Array<[string, (p: Player) => string | number]> = [
  ['Full name', (p) => p.fullName],
  ['Date of birth', (p) => displayDate(p.dateOfBirth)],
  ['Age', (p) => ageOn(p.dateOfBirth) ?? ''],
  ['Village', (p) => villageLabel(p.village)],
  // Spaced format keeps spreadsheet apps from turning the number into 9.48E+10.
  ['WhatsApp', (p) => displayWhatsapp(p.whatsappNumber)],
  ['Playing role', (p) => roleLabel(p.playingRole)],
  ['Batting style', (p) => battingLabel(p.battingStyle)],
  ['Jersey size', (p) => p.jerseySize],
  ['Name on jersey', (p) => p.jerseyName],
  ['Jersey number', (p) => p.jerseyNumber],
  ['Registered', (p) => displayRegisteredAt(p.createdAt)],
  ['Reference', (p) => `MSL-${p.id.slice(0, 8).toUpperCase()}`],
]

function csvCell(value: string | number): string {
  let text = String(value)
  // Neutralise spreadsheet formulas (CSV injection), except our own "+94 ..." phone format.
  if (/^[=@\t\r]/.test(text) || (/^[+-]/.test(text) && !/^\+94 /.test(text))) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(players: Player[]): string {
  const lines = [CSV_COLUMNS.map(([h]) => csvCell(h)).join(',')]
  for (const p of players) lines.push(CSV_COLUMNS.map(([, get]) => csvCell(get(p))).join(','))
  // BOM so Excel opens the file as UTF-8.
  return `﻿${lines.join('\r\n')}\r\n`
}
