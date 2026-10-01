import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RegistrationError, type RegistrationResult } from '../../services/registrationService'
import { RegistrationPage } from './RegistrationPage'
import type { RegistrationPayload } from './types'

const photo = new File([new Uint8Array(1024)], 'portrait.jpg', { type: 'image/jpeg' })

function setup(submit = vi.fn(async (_p: RegistrationPayload): Promise<RegistrationResult> => ({ registrationId: 'MSL-0001' }))) {
  const user = userEvent.setup({ applyAccept: false })
  render(<RegistrationPage submit={submit} />)
  return { user, submit }
}

const continueBtn = () => screen.getByRole('button', { name: /continue/i })

async function fillPersonal(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), '  Nimal   Silva ')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1999-07-21' } })
  await user.click(screen.getByRole('radio', { name: 'Yagasmulla' }))
  await user.type(screen.getByLabelText(/whatsapp number/i), '0712345678')
}

async function fillProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /wicket keeper/i }))
  await user.click(screen.getByRole('radio', { name: 'Left Hand' }))
  await user.upload(screen.getByTestId('photo-input'), photo)
  await user.click(screen.getByRole('radio', { name: 'XL' }))
  await user.type(screen.getByLabelText(/name on jersey/i), 'silva')
  await user.type(screen.getByLabelText(/jersey number/i), '07')
}

describe('RegistrationPage', () => {
  it('does not show errors until the player tries to continue', async () => {
    const { user } = setup()
    expect(screen.queryByText(/please enter your full name/i)).not.toBeInTheDocument()

    await user.click(continueBtn())

    expect(screen.getByText('Please enter your full name.')).toBeInTheDocument()
    expect(screen.getByText('Please enter your date of birth.')).toBeInTheDocument()
    expect(screen.getByText('Please select your village.')).toBeInTheDocument()
    expect(screen.getByText('Please enter your WhatsApp number.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /personal info/i })).toBeInTheDocument()
  })

  it('validates a single field on blur', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText(/whatsapp number/i), '0112345678')
    await user.tab()
    expect(screen.getByText('Please enter a valid WhatsApp number.')).toBeInTheDocument()
    expect(screen.queryByText('Please enter your full name.')).not.toBeInTheDocument()
  })

  it('blocks non-numeric jersey numbers and rejects invalid photo files', async () => {
    const { user } = setup()
    await fillPersonal(user)
    await user.click(continueBtn())

    const jersey = screen.getByLabelText(/jersey number/i)
    await user.type(jersey, '-a1b2c3')
    expect(jersey).toHaveValue('12')

    await user.upload(screen.getByTestId('photo-input'), new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' }))
    expect(screen.getByText('Please choose a JPG, PNG or WebP image.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /your player photo/i })).not.toBeInTheDocument()
  })

  it('completes the full flow, keeps data when going back, and submits a clean payload', async () => {
    const { user, submit } = setup()

    await fillPersonal(user)
    await user.click(continueBtn())
    expect(screen.getByRole('heading', { name: /player profile/i })).toBeInTheDocument()

    // Missing profile fields block the step.
    await user.click(screen.getByRole('button', { name: /review/i }))
    expect(screen.getByText('Please select your playing role.')).toBeInTheDocument()
    expect(screen.getByText('Please upload your player photo.')).toBeInTheDocument()
    expect(screen.getByText('Please select your jersey size.')).toBeInTheDocument()
    expect(screen.getByText('Please enter the name for your jersey.')).toBeInTheDocument()
    expect(screen.getByText('Please enter a jersey number.')).toBeInTheDocument()

    // Back keeps step 1 data.
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(await screen.findByRole('heading', { name: /personal info/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Nimal Silva')
    expect(screen.getByRole('radio', { name: 'Yagasmulla' })).toBeChecked()
    await user.click(continueBtn())

    await fillProfile(user)
    expect(screen.getByRole('img', { name: /your player photo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /change photo/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /review/i }))

    // Review summary
    expect(screen.getByRole('heading', { name: /review & submit/i })).toBeInTheDocument()
    const personal = within(screen.getByRole('region', { name: /personal information/i }))
    expect(personal.getByText('Nimal Silva')).toBeInTheDocument()
    expect(personal.getByText('21/07/1999')).toBeInTheDocument()
    expect(personal.getByText('Yagasmulla')).toBeInTheDocument()
    expect(personal.getByText('+94 71 234 5678')).toBeInTheDocument()
    const profile = within(screen.getByRole('region', { name: /player profile/i }))
    expect(profile.getByText('Wicket Keeper')).toBeInTheDocument()
    expect(profile.getByText('Left Hand')).toBeInTheDocument()
    expect(profile.getByText('XL')).toBeInTheDocument()
    expect(profile.getByText('#7')).toBeInTheDocument()
    expect(profile.getByText('SILVA')).toBeInTheDocument()

    // Edit from review returns to the right step with data intact.
    await user.click(screen.getByRole('button', { name: /edit player profile/i }))
    expect(await screen.findByRole('heading', { name: /player profile/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'XL' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: /review/i }))

    await user.click(screen.getByRole('button', { name: /submit registration/i }))

    expect(submit).toHaveBeenCalledTimes(1)
    expect(submit.mock.calls[0][0]).toMatchObject({
      fullName: 'Nimal Silva',
      dateOfBirth: '1999-07-21',
      village: 'yagasmulla',
      whatsappNumber: '+94712345678',
      playingRole: 'wicket_keeper',
      battingStyle: 'left',
      jerseySize: 'XL',
      jerseyName: 'SILVA',
      jerseyNumber: 7,
      playerPhoto: photo,
    })
    expect(await screen.findByRole('heading', { name: /registration complete/i })).toBeInTheDocument()
    expect(screen.getByText('MSL-0001')).toBeInTheDocument()
  })

  it('shows a loading state, prevents double submission, and never claims success on failure', async () => {
    let reject!: (e: unknown) => void
    const submit = vi.fn(
      () =>
        new Promise<RegistrationResult>((_resolve, rej) => {
          reject = rej
        }),
    )
    const { user } = setup(submit)
    await fillPersonal(user)
    await user.click(continueBtn())
    await fillProfile(user)
    await user.click(screen.getByRole('button', { name: /review/i }))

    await user.click(screen.getByRole('button', { name: /submit registration/i }))
    const busy = screen.getByRole('button', { name: /submitting/i })
    expect(busy).toBeDisabled()
    await user.click(busy)
    expect(submit).toHaveBeenCalledTimes(1)

    await act(async () => reject(new RegistrationError('network', "We couldn't reach the server.")))

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't reach the server.")
    expect(screen.queryByRole('heading', { name: /registration complete/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled()
  })

  it('surfaces a duplicate jersey number from the server on the jersey field', async () => {
    const submit = vi.fn(async (): Promise<RegistrationResult> => {
      throw new RegistrationError('conflict', 'Jersey number 7 is already taken. Please choose another.', {
        jerseyNumber: 'Jersey number 7 is already taken. Please choose another.',
      })
    })
    const { user } = setup(submit)
    await fillPersonal(user)
    await user.click(continueBtn())
    await fillProfile(user)
    await user.click(screen.getByRole('button', { name: /review/i }))
    await user.click(screen.getByRole('button', { name: /submit registration/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already taken/)
    await user.click(screen.getByRole('button', { name: /edit details/i }))
    expect(await screen.findByRole('heading', { name: /player profile/i })).toBeInTheDocument()
    expect(screen.getByText('Jersey number 7 is already taken. Please choose another.')).toBeInTheDocument()

    // Changing the number clears the server error.
    const jersey = screen.getByLabelText(/jersey number/i)
    await user.clear(jersey)
    await user.type(jersey, '18')
    expect(screen.queryByText(/already taken/)).not.toBeInTheDocument()
  })

  it('restores text fields from the session draft after a reload', async () => {
    const { user } = setup()
    await fillPersonal(user)
    screen.getByRole('heading', { name: /personal info/i })

    // Simulate a reload by unmounting and rendering again.
    const { unmount } = render(<RegistrationPage submit={vi.fn()} />)
    const names = screen.getAllByLabelText(/full name/i)
    expect(names[names.length - 1]).toHaveValue('Nimal Silva')
    unmount()
  })
})
