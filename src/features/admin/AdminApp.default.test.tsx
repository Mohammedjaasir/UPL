import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminService } from './adminService'

const calls = { create: 0, currentOrganiser: 0 }

// Every call returns a NEW service object, like the real factory does.
vi.mock('./adminService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./adminService')>()
  return {
    ...actual,
    getDefaultAdminService: (): AdminService => {
      calls.create += 1
      return {
        currentOrganiser: async () => {
          calls.currentOrganiser += 1
          return null
        },
        onSignOut: () => () => {},
        signIn: async (email) => ({ email }),
        signOut: async () => {},
        isOrganiser: async () => true,
        listPlayers: async () => [],
        deletePlayer: async () => {},
        updatePlayer: async (player) => player,
      }
    },
  }
})

describe('AdminApp with the default service', () => {
  it('creates the service once and checks the session once (no render loop)', async () => {
    const { AdminApp } = await import('./AdminApp')
    render(<AdminApp />)
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 50))
    expect(calls.create).toBe(1)
    expect(calls.currentOrganiser).toBe(1)
  })
})
