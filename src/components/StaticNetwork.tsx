// Static SVG rendering of the hero network, used on low-power devices and
// for reduced-motion users in place of the WebGL canvas.
const N = 90
const golden = Math.PI * (3 - Math.sqrt(5))
const tiltX = 0.35
const tiltY = 0.6

const pts = Array.from({ length: N }, (_, i) => {
  const y = 1 - (i / (N - 1)) * 2
  const r = Math.sqrt(1 - y * y)
  const th = golden * i
  let x = Math.cos(th) * r
  let z = Math.sin(th) * r
  let yy = y
  ;[x, z] = [x * Math.cos(tiltY) - z * Math.sin(tiltY), x * Math.sin(tiltY) + z * Math.cos(tiltY)]
  ;[yy, z] = [yy * Math.cos(tiltX) - z * Math.sin(tiltX), yy * Math.sin(tiltX) + z * Math.cos(tiltX)]
  return { x: 200 + x * 150, y: 200 + yy * 150, z }
})

const pairs: [number, number][] = []
pts.forEach((p, i) => {
  pts
    .map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + ((p.z - q.z) * 150) ** 2 }))
    .filter((o) => o.j > i)
    .sort((a, b) => a.d - b.d)
    .slice(0, 2)
    .forEach((o) => pairs.push([i, o.j]))
})

export function StaticNetwork({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="Illustration of a connected network">
      <defs>
        <radialGradient id="core" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="var(--bg-elev)" />
          <stop offset="1" stopColor="var(--subtle)" />
        </radialGradient>
      </defs>
      <g stroke="var(--muted)" strokeWidth="0.6">
        {pairs.map(([a, b], k) => (
          <line
            key={k}
            x1={pts[a].x}
            y1={pts[a].y}
            x2={pts[b].x}
            y2={pts[b].y}
            opacity={0.12 + ((pts[a].z + pts[b].z) / 2 + 1) * 0.12}
          />
        ))}
      </g>
      <polygon points="200,150 243,175 243,225 200,250 157,225 157,175" fill="url(#core)" opacity="0.9" />
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={(i % 9 === 0 ? 3.6 : 2.4) * (0.75 + (p.z + 1) * 0.2)}
          fill={i % 9 === 0 ? 'var(--accent)' : 'var(--fg)'}
          opacity={0.35 + (p.z + 1) * 0.3}
        />
      ))}
    </svg>
  )
}
