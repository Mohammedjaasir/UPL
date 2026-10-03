import { lazy, Suspense, type ReactNode } from 'react'
import { LandingPage } from './features/landing/LandingPage'

// Only the landing page is in the main bundle; every other screen is its own chunk.
const RegistrationPage = lazy(() =>
  import('./features/registration/RegistrationPage').then((m) => ({ default: m.RegistrationPage })),
)
const RosterPage = lazy(() => import('./features/roster/RosterPage').then((m) => ({ default: m.RosterPage })))
const AdminApp = lazy(() => import('./features/admin/AdminApp').then((m) => ({ default: m.AdminApp })))

const route = (path: string) => path.replace(/\/+$/, '') || '/'

export default function App() {
  const lazyScreen = (screen: ReactNode) => <Suspense fallback={null}>{screen}</Suspense>
  switch (route(window.location.pathname)) {
    case '/register':
      return lazyScreen(<RegistrationPage />)
    case '/players':
      return lazyScreen(<RosterPage />)
    case '/admin':
      return lazyScreen(<AdminApp />)
    default:
      return <LandingPage />
  }
}
