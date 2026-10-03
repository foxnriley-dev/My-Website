export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-fg" />
      <g className="stroke-bg" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M10 11l6-3 6 3v10l-6 3-6-3z" opacity=".45" />
        <path d="M16 8v8m0 0l6 5m-6-5l-6 5" />
      </g>
      <circle cx="16" cy="16" r="2.4" className="fill-accent" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark className="h-7 w-7" />
      <span className="text-[17px] font-semibold tracking-[-0.03em]">SuperCru</span>
    </span>
  )
}
