import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AdminApp } from './AdminApp'
import { AdminError, type AdminService, type PlayerChanges } from './adminService'
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
    deletePlayer: vi.fn(async () => {}),
    updatePlayer: vi.fn(async (player: Player) => player),
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

  it('deletes a player only after confirmation and frees the list', async () => {
    const user = userEvent.setup()
    const deletePlayer = vi.fn(async () => {})
    render(<AdminApp service={fakeService({ deletePlayer })} />)

    await user.click(await screen.findByRole('button', { name: /kasun perera, number 7/i }))
    const dialog = screen.getByRole('dialog', { name: 'Kasun Perera' })

    // First click only asks; "Keep" backs out without deleting.
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(within(dialog).getByText(/jersey #7 becomes free/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Keep' }))
    expect(deletePlayer).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(deletePlayer).toHaveBeenCalledWith(expect.objectContaining({ id: players[0].id, photoPath: 'a.jpg' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Deleted Kasun Perera. Jersey #7 is free again.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const list = screen.getByRole('list', { name: /registered players/i })
    expect(within(list).getAllByRole('button')).toHaveLength(1)
    const total = within(screen.getByRole('region', { name: /summary/i })).getByText('Players').closest('.stat')
    expect(total).toHaveTextContent('Players1')
  })

  it('keeps the player and shows the reason when a delete fails', async () => {
    const user = userEvent.setup()
    const deletePlayer = vi.fn(async () => {
      throw new AdminError('server', 'This registration was not deleted.')
    })
    render(<AdminApp service={fakeService({ deletePlayer })} />)

    await user.click(await screen.findByRole('button', { name: /kasun perera, number 7/i }))
    const dialog = screen.getByRole('dialog', { name: 'Kasun Perera' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('This registration was not deleted.')
    expect(within(dialog).getByRole('button', { name: /try again/i })).toBeEnabled()
    expect(within(screen.getByRole('list', { name: /registered players/i })).getAllByRole('button')).toHaveLength(2)
  })

  it('edits a player with the same rules as registration and shows the saved values', async () => {
    const user = userEvent.setup()
    const updatePlayer = vi.fn(async (player: Player, changes: PlayerChanges) => ({
      ...player,
      ...changes,
    }))
    render(<AdminApp service={fakeService({ updatePlayer })} />)

    await user.click(await screen.findByRole('button', { name: /kasun perera, number 7/i }))
    const dialog = screen.getByRole('dialog', { name: 'Kasun Perera' })
    await user.click(within(dialog).getByRole('button', { name: 'Edit' }))

    const form = within(dialog).getByRole('form', { name: 'Edit Kasun Perera' })
    expect(within(form).getByLabelText('WhatsApp')).toHaveValue('0771234567')

    // Invalid values are caught before saving.
    const dob = within(form).getByLabelText('Date of birth')
    await user.clear(dob)
    await user.type(dob, '2015-03-01')
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))
    expect(within(form).getByText('Players must be born in 2012 or earlier.')).toBeInTheDocument()
    expect(updatePlayer).not.toHaveBeenCalled()

    await user.clear(dob)
    await user.type(dob, '2000-05-02')
    await user.selectOptions(within(form).getByLabelText('Village'), 'yagasmulla')
    const number = within(form).getByLabelText('Jersey number')
    await user.clear(number)
    await user.type(number, '24')
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))

    expect(updatePlayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: players[0].id }),
      expect.objectContaining({ dateOfBirth: '2000-05-02', village: 'yagasmulla', jerseyNumber: 24, whatsappNumber: '+94771234567' }),
      null,
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Saved changes to Kasun Perera.')
    expect(within(dialog).getByText('Bowler, Yagasmulla')).toBeInTheDocument()
  })

  it('keeps the edit form open and points at the field when a jersey number is taken', async () => {
    const user = userEvent.setup()
    const updatePlayer = vi.fn(async () => {
      throw new AdminError('conflict', 'Jersey number 18 is already taken by another player.')
    })
    render(<AdminApp service={fakeService({ updatePlayer })} />)
    await user.click(await screen.findByRole('button', { name: /kasun perera, number 7/i }))
    const dialog = screen.getByRole('dialog', { name: 'Kasun Perera' })
    await user.click(within(dialog).getByRole('button', { name: 'Edit' }))
    const form = within(dialog).getByRole('form', { name: 'Edit Kasun Perera' })
    await user.click(within(form).getByRole('button', { name: 'Save changes' }))
    expect((await within(form).findAllByText('Jersey number 18 is already taken by another player.')).length).toBeGreaterThan(0)
    expect(within(form).getByRole('button', { name: 'Save changes' })).toBeEnabled()
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
