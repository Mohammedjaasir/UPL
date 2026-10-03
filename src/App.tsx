import { lazy, Suspense } from 'react'
import { RegistrationPage } from './features/registration/RegistrationPage'

// The organiser dashboard ships as its own chunk so players never download it.
const AdminApp = lazy(() => import('./features/admin/AdminApp').then((m) => ({ default: m.AdminApp })))

const isAdminRoute = (path: string) => /^\/admin\/?$/.test(path)

export default function App() {
  if (isAdminRoute(window.location.pathname)) {
    return (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    )
  }
  return <RegistrationPage />
}
