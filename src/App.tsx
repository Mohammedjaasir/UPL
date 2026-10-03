import { lazy, Suspense } from 'react'
import { RegistrationPage } from './features/registration/RegistrationPage'

// The organiser dashboard and the public player list ship as their own chunks,
// so the registration form stays as small as possible.
const AdminApp = lazy(() => import('./features/admin/AdminApp').then((m) => ({ default: m.AdminApp })))
const RosterPage = lazy(() => import('./features/roster/RosterPage').then((m) => ({ default: m.RosterPage })))

const isAdminRoute = (path: string) => /^\/admin\/?$/.test(path)
const isRosterRoute = (path: string) => /^\/players\/?$/.test(path)

export default function App() {
  if (isAdminRoute(window.location.pathname)) {
    return (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    )
  }
  if (isRosterRoute(window.location.pathname)) {
    return (
      <Suspense fallback={null}>
        <RosterPage />
      </Suspense>
    )
  }
  return <RegistrationPage />
}
