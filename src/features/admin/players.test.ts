import { describe, expect, it } from 'vitest'
import {
  ageOn,
  DEFAULT_QUERY,
  fromRow,
  matchesSearch,
  queryPlayers,
  summarize,
  toCsv,
  whatsappLink,
  type Player,
  type PlayerRow,
} from './players'

const row = (over: Partial<PlayerRow>): PlayerRow => ({
  id: '3f9a1c2b-0000-4000-8000-000000000001',
  created_at: '2026-10-02T10:00:00Z',
  full_name: 'Kasun Perera',
  date_of_birth: '2001-04-12',
  village: 'miella',
  whatsapp_number: '+94771234567',
  playing_role: 'bowler',
  batting_style: 'right',
  jersey_size: 'M',
  jersey_name: 'PERERA',
  jersey_number: 7,
  photo_path: 'a.jpg',
  ...over,
})

const players: Player[] = [
  fromRow(row({})),
  fromRow(
    row({
      id: 'b2',
      created_at: '2026-10-03T08:00:00Z',
      full_name: 'Nuwan Bandara',
      village: 'kirinda',
      playing_role: 'wicket_keeper',
      jersey_name: 'NUWA',
      jersey_number: 18,
      jersey_size: 'L',
      whatsapp_number: '+94712223344',
    }),
  ),
  fromRow(
    row({
      id: 'c3',
      created_at: '2026-10-01T08:00:00Z',
      full_name: 'Amila Silva',
      village: 'kirinda',
      playing_role: 'all_rounder',
      jersey_name: 'SILVA',
      jersey_number: 1,
    }),
  ),
]

describe('summarize', () => {
  it('counts every option, including zeros, in a fixed order', () => {
    const s = summarize(players)
    expect(s.total).toBe(3)
    expect(s.villages.map((v) => [v.label, v.count])).toEqual([
      ['Miella', 1],
      ['Kirinda', 2],
      ['Yagasmulla', 0],
    ])
    expect(s.roles.find((r) => r.value === 'batsman')?.count).toBe(0)
    expect(s.sizes.find((r) => r.value === 'M')?.count).toBe(2)
    expect(s.sizes).toHaveLength(7)
  })
})

describe('search and filters', () => {
  it('matches names, jersey names, numbers and phone numbers in any format', () => {
    const p = players[0]
    expect(matchesSearch(p, 'kasun')).toBe(true)
    expect(matchesSearch(p, 'PERERA')).toBe(true)
    expect(matchesSearch(p, '#7')).toBe(true)
    expect(matchesSearch(p, '17')).toBe(false)
    expect(matchesSearch(p, '0771234567')).toBe(true)
    expect(matchesSearch(p, '+94 77 123')).toBe(true)
    expect(matchesSearch(p, '4567')).toBe(true)
    expect(matchesSearch(p, '0719')).toBe(false)
    expect(matchesSearch(p, '')).toBe(true)
  })

  it('filters by village and role, and sorts', () => {
    const q = { ...DEFAULT_QUERY, village: 'kirinda' as const }
    expect(queryPlayers(players, q).map((p) => p.fullName)).toEqual(['Nuwan Bandara', 'Amila Silva'])
    expect(queryPlayers(players, { ...q, role: 'all_rounder' }).map((p) => p.fullName)).toEqual(['Amila Silva'])
    expect(queryPlayers(players, { ...DEFAULT_QUERY, sort: 'number' }).map((p) => p.jerseyNumber)).toEqual([1, 7, 18])
    expect(queryPlayers(players, { ...DEFAULT_QUERY, sort: 'name' })[0].fullName).toBe('Amila Silva')
    expect(queryPlayers(players, { ...DEFAULT_QUERY, sort: 'oldest' })[0].fullName).toBe('Amila Silva')
  })
})

describe('helpers', () => {
  it('computes age on a given day', () => {
    expect(ageOn('2001-04-12', new Date(2026, 3, 11))).toBe(24)
    expect(ageOn('2001-04-12', new Date(2026, 3, 12))).toBe(25)
    expect(ageOn('bad')).toBeNull()
  })

  it('builds wa.me links from E.164 numbers', () => {
    expect(whatsappLink('+94771234567')).toBe('https://wa.me/94771234567')
  })
})

describe('toCsv', () => {
  it('writes a header, one row per player and keeps phone numbers as text', () => {
    const csv = toCsv([players[0]])
    expect(csv.startsWith('﻿Full name,Date of birth,')).toBe(true)
    const lines = csv.trim().split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('Kasun Perera,12/04/2001,')
    expect(lines[1]).toContain('+94 77 123 4567')
    expect(lines[1]).toContain('MSL-3F9A1C2B')
  })

  it('neutralises spreadsheet formulas and quotes commas', () => {
    const evil = fromRow(row({ full_name: '=HYPERLINK("x")', jersey_name: 'A, B' }))
    const line = toCsv([evil]).trim().split('\r\n')[1]
    expect(line.startsWith(`"'=HYPERLINK(""x"")"`)).toBe(true)
    expect(line).toContain('"A, B"')
  })
})
