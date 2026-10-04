import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { RosterPlayer } from '../roster/rosterService'
import { RoleShowcase } from './RoleShowcase'

const player = (id: string, playingRole: RosterPlayer['playingRole']): RosterPlayer => ({
  id,
  fullName: id,
  village: 'miella',
  playingRole,
  battingStyle: 'right',
  jerseyName: id.toUpperCase(),
  jerseyNumber: 1,
  photoUrl: null,
  createdAt: '2026-10-02T10:00:00Z',
})

const players = [player('a', 'bowler'), player('b', 'bowler'), player('c', 'all_rounder')]

describe('RoleShowcase', () => {
  it('shows each role with live counts and switches on click', async () => {
    const user = userEvent.setup()
    render(<RoleShowcase players={players} />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Batsman0', 'Bowler2', 'All-rounder1', 'Wicket Keeper0'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByRole('heading', { name: 'Batsman' })).toBeInTheDocument()
    expect(within(panel).getByText('No batsmen yet. Be the first.')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /bowler/i }))
    expect(within(screen.getByRole('tabpanel')).getByText('2 players have registered as a bowler.')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /all-rounder/i }))
    const cta = within(screen.getByRole('tabpanel')).getByRole('link', { name: /register as an all-rounder/i })
    expect(cta).toHaveAttribute('href', '/register')
    cta.addEventListener('click', (e) => e.preventDefault()) // jsdom cannot navigate
    await user.click(cta)
    expect(JSON.parse(sessionStorage.getItem('msl.registration.draft.v1') ?? '{}')).toMatchObject({
      playingRole: 'all_rounder',
    })
  })

  it('supports arrow keys like a standard tab list', async () => {
    const user = userEvent.setup()
    render(<RoleShowcase players={players} />)
    const tabs = screen.getAllByRole('tab')
    tabs[0].focus()
    await user.keyboard('{ArrowDown}')
    expect(tabs[1]).toHaveFocus()
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(tabs[3]).toHaveFocus()
    await user.keyboard('{Home}')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('works before live data arrives', () => {
    render(<RoleShowcase players={null} />)
    expect(within(screen.getByRole('tabpanel')).getByText('Pick it in the Your kit step.')).toBeInTheDocument()
  })
})
