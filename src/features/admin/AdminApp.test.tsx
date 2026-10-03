import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AdminApp } from './AdminApp'
import { AdminError, type AdminService } from './adminService'
import { fromRow, type Player } from './players'

const players: Player[] = [
  fromRow(
    {
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
    },
    'https://example.test/a.jpg',
  ),
  fromRow({
    id: '7c1e0000-0000-4000-8000-000000000002',
    created_at: '2026-10-03T08:00:00Z',
    full_name: 'Nuwan Bandara',
    date_of_birth: '1998-01-30',
    village: 'kirinda',
    whatsapp_number: '+94712223344',
    playing_role: 'wicket_keeper',
    batting_style: 'left',
    jersey_size: 'L',
    jersey_name: 'NUWA',
    jersey_number: 18,
    photo_path: 'b.jpg',
  }),
]

function fakeService(over: Partial<AdminService> = {}): AdminService {
  return {
    currentOrganiser: vi.fn(async () => ({ email: 'org@msl.lk' })),
    onSignOut: vi.fn(() => () => {}),
    signIn: vi.fn(async (email: string) => ({ email })),
    signOut: vi.fn(async () => {}),
    isOrganiser: vi.fn(async () => true),
    listPlayers: vi.fn(async () => players),
    ...over,
  }
}

describe('AdminApp', () => {
  it('asks for a sign-in, rejects a wrong password, then shows the roster', async () => {
    const user = userEvent.setup()
    const signIn = vi
      .fn()
      .mockRejectedValueOnce(new AdminError('auth', 'That email and password did not match an organiser account.'))
      .mockResolvedValueOnce({ email: 'org@msl.lk' })
    render(<AdminApp service={fakeService({ currentOrganiser: vi.fn(async () => null), signIn })} />)

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your email and password.')

    await user.type(screen.getByLabelText(/email/i), 'org@msl.lk')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/did not match/)

    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByRole('heading', { name: /registered players/i })).toBeInTheDocument()
    expect(signIn).toHaveBeenLastCalledWith('org@msl.lk', 'wrong')
  })

  it('blocks signed-in accounts that are not organisers', async () => {
    render(<AdminApp service={fakeService({ isOrganiser: vi.fn(async () => false) })} />)
    expect(await screen.findByRole('heading', { name: /no access yet/i })).toBeInTheDocument()
    expect(screen.getByText(/org@msl.lk is signed in, but it is not on the organiser list/)).toBeInTheDocument()
  })

  it('shows counts, filters the roster and opens a player', async () => {
    const user = userEvent.setup()
    render(<AdminApp service={fakeService()} />)

    const list = await screen.findByRole('list', { name: /registered players/i })
    expect(within(list).getAllByRole('button')).toHaveLength(2)
    const summary = screen.getByRole('region', { name: /summary/i })
    expect(within(summary).getByText('2')).toBeInTheDocument()

    await user.click(within(screen.getByRole('group', { name: 'Village' })).getByRole('button', { name: 'Kirinda' }))
    expect(within(list).getAllByRole('button')).toHaveLength(1)
    expect(screen.getByText('1 of 2 players')).toBeInTheDocument()

    await user.click(within(screen.getByRole('group', { name: 'Village' })).getByRole('button', { name: 'All' }))
    await user.type(screen.getByRole('searchbox', { name: /search players/i }), 'zzz')
    expect(await screen.findByText('No players match')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    await user.click(screen.getByRole('button', { name: /kasun perera, number 7/i }))
    const dialog = screen.getByRole('dialog', { name: 'Kasun Perera' })
    expect(within(dialog).getByText('+94 77 123 4567')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /whatsapp/i })).toHaveAttribute('href', 'https://wa.me/94771234567')
    expect(within(dialog).getByText('MSL-3F9A1C2B')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows an empty state and a load error with retry', async () => {
    const user = userEvent.setup()
    const listPlayers = vi
      .fn()
      .mockRejectedValueOnce(new AdminError('network', "We couldn't reach the server."))
      .mockResolvedValueOnce([])
    render(<AdminApp service={fakeService({ listPlayers })} />)

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't reach the server.")
    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('No registrations yet')).toBeInTheDocument()
  })

  it('explains a build without Supabase keys', () => {
    render(<AdminApp service={null} />)
    expect(screen.getByRole('heading', { name: /not connected/i })).toBeInTheDocument()
  })
})
