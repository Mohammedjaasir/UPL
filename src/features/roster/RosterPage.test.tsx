import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_ROSTER_QUERY, filterRoster } from './roster'
import { RosterPage } from './RosterPage'
import { createSupabaseRosterService, RosterError, type RosterPlayer, type RosterService } from './rosterService'

const players: RosterPlayer[] = [
  {
    id: 'a',
    fullName: 'Kasun Perera',
    village: 'miella',
    playingRole: 'bowler',
    battingStyle: 'right',
    jerseyName: 'PERERA',
    jerseyNumber: 7,
    photoUrl: 'https://example.test/a.jpg',
    createdAt: '2026-10-02T10:00:00Z',
  },
  {
    id: 'b',
    fullName: 'Nuwan Bandara',
    village: 'kirinda',
    playingRole: 'wicket_keeper',
    battingStyle: 'left',
    jerseyName: 'NUWA',
    jerseyNumber: 18,
    photoUrl: null,
    createdAt: '2026-10-03T10:00:00Z',
  },
]

const service = (over: Partial<RosterService> = {}): RosterService => ({
  listPlayers: vi.fn(async () => players),
  ...over,
})

describe('filterRoster', () => {
  it('matches name, jersey name and exact jersey number', () => {
    const q = DEFAULT_ROSTER_QUERY
    expect(filterRoster(players, { ...q, search: 'kasun' })).toHaveLength(1)
    expect(filterRoster(players, { ...q, search: 'nuwa' })).toHaveLength(1)
    expect(filterRoster(players, { ...q, search: '#7' }).map((p) => p.id)).toEqual(['a'])
    expect(filterRoster(players, { ...q, search: '07' }).map((p) => p.id)).toEqual(['a'])
    expect(filterRoster(players, { ...q, search: '1' })).toHaveLength(0)
    expect(filterRoster(players, { ...q, village: 'kirinda' }).map((p) => p.id)).toEqual(['b'])
    expect(filterRoster(players, { ...q, role: 'bowler' }).map((p) => p.id)).toEqual(['a'])
  })
})

describe('RosterPage', () => {
  it('shows public details only, and filters', async () => {
    const user = userEvent.setup()
    const { container } = render(<RosterPage service={service()} />)

    const list = await screen.findByRole('list', { name: 'Players' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('2 players from Miella, Kirinda and Yagasmulla.')).toBeInTheDocument()

    const kasun = within(list).getByRole('heading', { name: 'Kasun Perera' }).closest('li')!
    expect(within(kasun).getByText('Bowler')).toBeInTheDocument()
    expect(within(kasun).getByText('Right Hand')).toBeInTheDocument()
    expect(within(kasun).getByText('Miella')).toBeInTheDocument()
    expect(within(kasun).getByLabelText('Jersey number 7')).toBeInTheDocument()
    expect(within(kasun).getByRole('img', { name: 'Kasun Perera' })).toHaveAttribute('src', 'https://example.test/a.jpg')
    expect(container.textContent).not.toMatch(/\+94|whatsapp/i)

    await user.click(within(screen.getByRole('group', { name: 'Role' })).getByRole('button', { name: 'Wicket Keeper' }))
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Showing 1 of 2')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: /search players/i }), 'zzz')
    expect(await screen.findByText('No players match')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /clear filters/i }))
    expect(within(screen.getByRole('list', { name: 'Players' })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows an error with retry, then an empty state', async () => {
    const user = userEvent.setup()
    const listPlayers = vi
      .fn()
      .mockRejectedValueOnce(new RosterError('The player list is not available right now. Please try again later.'))
      .mockResolvedValueOnce([])
    render(<RosterPage service={service({ listPlayers })} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('not available right now')
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('No players yet')).toBeInTheDocument()
  })

  it('explains a build without Supabase keys', async () => {
    render(<RosterPage service={null} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('not available on this site yet')
  })
})

describe('createSupabaseRosterService', () => {
  it('calls the public roster function and builds public photo links', async () => {
    const rpc = vi.fn(async () => ({
      data: [
        {
          id: 'a',
          full_name: 'Kasun Perera',
          village: 'miella',
          playing_role: 'bowler',
          batting_style: 'right',
          jersey_name: 'PERERA',
          jersey_number: 7,
          photo_path: 'a.jpg',
          created_at: '2026-10-02T10:00:00Z',
        },
      ],
      error: null,
    }))
    const getPublicUrl = vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }))
    const client = { rpc, storage: { from: () => ({ getPublicUrl }) } } as unknown as Parameters<
      typeof createSupabaseRosterService
    >[0]

    const result = await createSupabaseRosterService(client).listPlayers()
    expect(rpc).toHaveBeenCalledWith('get_public_roster')
    expect(result[0]).toMatchObject({ fullName: 'Kasun Perera', jerseyNumber: 7, photoUrl: 'https://cdn.test/a.jpg' })
  })
})
