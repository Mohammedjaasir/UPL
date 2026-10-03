import { useCallback, useEffect, useState } from 'react'
import '../registration/registration.css'
import { AlertIcon, Spinner } from '../registration/components/icons'
import { AdminError, getDefaultAdminService, type AdminService, type Organiser } from './adminService'
import '../shared/controls.css'
import './admin.css'
import { Dashboard } from './Dashboard'
import { GateScreen } from './GateScreen'
import { LoginScreen } from './LoginScreen'

type Gate =
  | { kind: 'checking' }
  | { kind: 'signed-out' }
  | { kind: 'not-organiser'; organiser: Organiser }
  | { kind: 'ready'; organiser: Organiser }
  | { kind: 'error'; message: string }

interface AdminAppProps {
  /** Injected in tests; defaults to the Supabase-backed service. */
  service?: AdminService | null
}

export function AdminApp(props: AdminAppProps) {
  // Created once: a new service object per render would re-run the auth effect forever.
  const [service] = useState(() => (props.service !== undefined ? props.service : getDefaultAdminService()))
  const [gate, setGate] = useState<Gate>({ kind: 'checking' })

  useEffect(() => {
    document.title = 'Organisers · Miella Super League'
  }, [])

  const resolve = useCallback(
    async (organiser: Organiser | null) => {
      if (!service) return
      if (!organiser) {
        setGate({ kind: 'signed-out' })
        return
      }
      try {
        const allowed = await service.isOrganiser()
        setGate(allowed ? { kind: 'ready', organiser } : { kind: 'not-organiser', organiser })
      } catch (error) {
        setGate({ kind: 'error', message: error instanceof AdminError ? error.message : 'Something went wrong.' })
      }
    },
    [service],
  )

  useEffect(() => {
    if (!service) return
    let active = true
    service
      .currentOrganiser()
      .then((o) => {
        if (active) void resolve(o)
      })
      .catch(() => {
        if (active) setGate({ kind: 'signed-out' })
      })
    const unsubscribe = service.onSignOut(() => setGate({ kind: 'signed-out' }))
    return () => {
      active = false
      unsubscribe()
    }
  }, [service, resolve])

  const signOut = useCallback(async () => {
    await service?.signOut()
    setGate({ kind: 'signed-out' })
  }, [service])

  if (!service) {
    return (
      <GateScreen title="Not connected">
        <p className="gate__text">
          This build has no Supabase keys. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as build variables
          and redeploy.
        </p>
      </GateScreen>
    )
  }

  switch (gate.kind) {
    case 'checking':
      return (
        <GateScreen title="Organisers">
          <p className="gate__text gate__loading" role="status">
            <Spinner /> Checking your sign-in…
          </p>
        </GateScreen>
      )
    case 'signed-out':
      return <LoginScreen service={service} onSignedIn={resolve} />
    case 'not-organiser':
      return (
        <GateScreen title="No access yet">
          <p className="gate__text">
            {gate.organiser.email} is signed in, but it is not on the organiser list. Ask the league admin to add
            this account.
          </p>
          <button type="button" className="btn btn--secondary btn--block" onClick={signOut}>
            Sign out
          </button>
        </GateScreen>
      )
    case 'error':
      return (
        <GateScreen title="Couldn't check access">
          <div className="alert" role="alert">
            <AlertIcon size={18} />
            <p className="alert__body">{gate.message}</p>
          </div>
          <button type="button" className="btn btn--primary btn--block gate__retry" onClick={() => window.location.reload()}>
            Try again
          </button>
        </GateScreen>
      )
    case 'ready':
      return <Dashboard service={service} organiser={gate.organiser} onSignOut={signOut} />
  }
}
