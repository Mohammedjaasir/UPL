import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RosterPlayer, RosterService } from '../roster/rosterService'
import { LandingPage } from './LandingPage'
import { jerseyFaces, latestPlayers, villageCounts } from './squad'

const make = (i: number, over: Partial<RosterPlayer> = {}): RosterPlayer => ({
  id: `p${i}`,
  fullName: `Player ${i}`,
  village: 'miella',
  playingRole: 'bowler',
  battingStyle: 'right',
  jerseyName: `NAME${i}`,
  jerseyNumber: i,
  photoUrl: null,
  createdAt: `2026-10-0${(i % 9) + 1}T10:00:00Z`,
  ...over,
})

const players = [make(1), make(2, { village: 'kirinda' }), make(3, { village: 'kirinda' })]
const service = (list: RosterPlayer[] | Error): RosterService => ({
  listPlayers: vi.fn(async () => {
    if (list instanceof Error) throw list
    return list
  }),
})

describe('squad helpers', () => {
  it('counts every village in a fixed order', () => {
    expect(villageCounts(players).map((v) => [v.label, v.count])).toEqual([
      ['Miella', 1],
      ['Kirinda', 2],
      ['Yagasmulla', 0],
    ])
  })

  it('lists newest players first and invites when nobody has registered', () => {
    expect(latestPlayers(players).map((p) => p.id)).toEqual(['p3', 'p2', 'p1'])
    expect(jerseyFaces([])).toEqual([
      { name: 'YOUR NAME', number: '10' },
      { name: 'YOUR NAME', number: '7' },
      { name: 'YOUR NAME', number: '23' },
    ])
    // Real players first, then invitations that only suggest free numbers.
    const withTen = [...players, make(10, { createdAt: '2026-09-01T10:00:00Z' })]
    expect(jerseyFaces(withTen).map((f) => `${f.name} ${f.number}`)).toEqual([
      'NAME3 3',
      'NAME2 2',
      'NAME1 1',
      'NAME10 10',
      'YOUR NAME 7',
      'YOUR NAME 23',
      'YOUR NAME 18',
    ])
  })
})

describe('LandingPage', () => {
  it('sends people to registration and the player list', async () => {
    render(<LandingPage service={service(players)} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Three villages.One league.')
    const registerLinks = screen.getAllByRole('link', { name: /^register( now)?$/i })
    expect(registerLinks.length).toBeGreaterThanOrEqual(3)
    for (const link of registerLinks) expect(link).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: /see the players/i })).toHaveAttribute('href', '/players')
    expect(await screen.findByText('3 players have registered so far.')).toBeInTheDocument()
  })

  it('shows live village counts and the newest players (reduced motion: no count-up)', async () => {
    // Reduced motion makes the counts final immediately, so this test does not depend on animation timing.
    const original = window.matchMedia
    window.matchMedia = vi.fn((query: string) => ({ matches: query.includes('reduce'), media: query })) as unknown as typeof window.matchMedia
    try {
      await assertVillagesAndStrip()
    } finally {
      window.matchMedia = original
    }
  })

  async function assertVillagesAndStrip() {
    render(<LandingPage service={service(players)} />)
    const grid = await screen.findByRole('list', { name: /recently registered players/i })
    const tiles = within(grid).getAllByRole('listitem')
    // Three real players, newest first, topped up with one open "your card here" slot.
    expect(tiles.map((li) => li.textContent)).toEqual([
      'Player 3Bowler, Right HandKirinda3',
      'Player 2Bowler, Right HandKirinda2',
      'Player 1Bowler, Right HandMiella1',
      'Your card hereRegister to join the squad',
    ])
    expect(within(tiles[3]).getByRole('link')).toHaveAttribute('href', '/register')
    const kirinda = screen.getByText('Kirinda', { selector: '.village-tile__name' }).closest('.village-tile')!
    // Set by an effect right after the players render: wait a tick, not for an animation.
    await waitFor(() => expect(kirinda.querySelector('.village-tile__num')).toHaveTextContent(/^2$/))
  }

  it('invites the first player when the list is empty', async () => {
    render(<LandingPage service={service([])} />)
    expect(await screen.findByText(/be the first name on the list/i)).toBeInTheDocument()
    expect(screen.getAllByText('Your card here')).toHaveLength(4)
  })

  it('lets a player design a jersey, warns about taken numbers, and carries it into the form', async () => {
    const user = userEvent.setup()
    render(<LandingPage service={service(players)} />)
    await screen.findByText('3 players have registered so far.')

    await user.type(screen.getByLabelText('Name on the back'), 'perera')
    expect(screen.getByLabelText('Name on the back')).toHaveValue('PERERA')

    const number = screen.getByLabelText('Number')
    await user.type(number, '2')
    expect(screen.getByText('Number 2 is already taken. Try another.')).toBeInTheDocument()
    await user.clear(number)
    await user.type(number, '10')
    expect(screen.getByText('Number 10 is free right now.')).toBeInTheDocument()

    await user.click(within(screen.getByRole('group', { name: 'Jersey size' })).getByRole('button', { name: 'L' }))
    const cta = screen.getByRole('link', { name: /register with this jersey/i })
    expect(cta).toHaveAttribute('href', '/register')
    cta.addEventListener('click', (e) => e.preventDefault()) // jsdom cannot navigate
    await user.click(cta)

    expect(JSON.parse(sessionStorage.getItem('msl.registration.draft.v1') ?? '{}')).toMatchObject({
      jerseyName: 'PERERA',
      jerseyNumber: '10',
      jerseySize: 'L',
    })
  })

  it('still works when live data is unavailable', async () => {
    render(<LandingPage service={service(new Error('offline'))} />)
    expect(await screen.findByText('Every player represents one of the three villages.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /the squad so far/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /^register now$/i })[0]).toHaveAttribute('href', '/register')
  })
})
