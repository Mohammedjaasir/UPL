/** Hero backdrop: floodlight towers, beams and the pitch from behind the bowler's arm. Decorative. */
export function Stadium() {
  return (
    <div className="stadium" aria-hidden="true">
      <Tower className="stadium__tower stadium__tower--l" />
      <Tower className="stadium__tower stadium__tower--r" />
      <span className="stadium__beam stadium__beam--l" />
      <span className="stadium__beam stadium__beam--r" />
      <svg className="stadium__pitch" viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax slice" focusable="false">
        {/* Boundary rope and 30-yard circle, in perspective. */}
        <ellipse className="stadium__rope" cx="600" cy="300" rx="760" ry="210" />
        <ellipse className="stadium__ring" cx="600" cy="300" rx="430" ry="130" />
        {/* The strip with its creases. */}
        <path className="stadium__strip" d="M565 120 L635 120 L668 260 L532 260 Z" />
        <path className="stadium__crease" d="M560 138 H640 M548 196 H652" />
      </svg>
    </div>
  )
}

function Tower({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 60 200" focusable="false">
      <rect className="stadium__pole" x="27" y="40" width="6" height="160" />
      <rect className="stadium__head" x="4" y="4" width="52" height="36" rx="4" />
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <circle
            key={`${row}-${col}`}
            className="stadium__lamp"
            cx={12 + col * 12}
            cy={12 + row * 10}
            r="3.4"
            style={{ animationDelay: `${(row * 4 + col) * 60}ms` }}
          />
        )),
      )}
    </svg>
  )
}

/** A white T20 ball with its seam. Decorative. */
export function CricketBall({ className = '' }: { className?: string }) {
  return (
    <svg className={`ball ${className}`} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="17" className="ball__leather" />
      <path className="ball__seam" d="M9 7 C17 15 17 25 9 33 M31 7 C23 15 23 25 31 33" />
      <path
        className="ball__stitch"
        d="M11 10 l2.4 -1.2 M13 14 l2.6 -0.6 M14 18 l2.7 0 M14 22 l2.7 0.2 M13 26 l2.6 0.8 M11 30 l2.4 1.2 M29 10 l-2.4 -1.2 M27 14 l-2.6 -0.6 M26 18 l-2.7 0 M26 22 l-2.7 0.2 M27 26 l-2.6 0.8 M29 30 l-2.4 1.2"
      />
    </svg>
  )
}
