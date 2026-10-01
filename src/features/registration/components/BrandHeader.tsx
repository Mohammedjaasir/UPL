export function LeagueCrest({ size = 48 }: { size?: number }) {
  return (
    <svg className="crest" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M32 3 57 12v20c0 15-10.5 25-25 29C17.5 57 7 47 7 32V12z" fill="var(--gold)" />
      <path d="M32 8.5 52 15.6V32c0 12-8.3 20.2-20 23.6C20.3 52.2 12 44 12 32V15.6z" fill="none" stroke="var(--on-gold)" strokeOpacity="0.28" strokeWidth="1.5" />
      <text x="32" y="38.5" textAnchor="middle" fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif" fontWeight="800" fontSize="19" letterSpacing="0.5" fill="var(--on-gold)">
        MPL
      </text>
    </svg>
  )
}

export function BrandHeader() {
  return (
    <header className="brand">
      <LeagueCrest />
      <div className="brand__text">
        <p className="brand__name">Miella Super League</p>
        <h1 className="brand__subtitle">Player Registration</h1>
      </div>
    </header>
  )
}
