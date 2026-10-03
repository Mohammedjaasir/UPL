import type { ReactNode } from 'react'
import { LeagueCrest } from '../registration/components/BrandHeader'

/** Centred brand card used for sign-in and access messages. */
export function GateScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="gate">
      <div className="gate__card card">
        <div className="gate__brand">
          <LeagueCrest size={44} />
          <div>
            <p className="brand__name">Miella Super League</p>
            <p className="brand__subtitle">Organisers</p>
          </div>
        </div>
        <h1 className="gate__title">{title}</h1>
        {children}
      </div>
    </main>
  )
}
