import { useState, type FormEvent } from 'react'
import { AlertIcon, Spinner } from '../registration/components/icons'
import { AdminError, type AdminService, type Organiser } from './adminService'
import { GateScreen } from './GateScreen'

interface LoginScreenProps {
  service: AdminService
  onSignedIn: (organiser: Organiser) => void
}

export function LoginScreen({ service, onSignedIn }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      onSignedIn(await service.signIn(email, password))
    } catch (e) {
      setError(e instanceof AdminError ? e.message : 'Sign-in failed. Please try again.')
      setBusy(false)
    }
  }

  return (
    <GateScreen title="Sign in">
      <p className="gate__text">Registered players are visible to league organisers only.</p>
      <form className="gate__form" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <div className="alert" role="alert">
            <AlertIcon size={18} />
            <p className="alert__body">{error}</p>
          </div>
        )}
        <button type="submit" className="btn btn--primary btn--block gate__submit" disabled={busy} aria-busy={busy}>
          {busy ? (
            <>
              <Spinner /> Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </GateScreen>
  )
}
