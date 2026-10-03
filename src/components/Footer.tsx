import type { MouseEvent } from 'react'
import { Logo } from './Logo'
import { contact, services } from '../content'
import { scrollToHash } from '../lib/smoothScroll'

const Facebook = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
    <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9z" />
  </svg>
)
const X = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
    <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" />
  </svg>
)

const go = (href: string) => (e: MouseEvent) => {
  e.preventDefault()
  scrollToHash(href)
}

export function Footer() {
  const company = [
    { label: 'About Us', href: '#about' },
    { label: 'Apple', href: '#apple' },
    { label: 'Helpdesk', href: '#helpdesk' },
    { label: 'Check-in', href: '#check-in' },
    { label: 'Contact', href: '#contact' },
  ]
  const col = 'mb-4 text-[13px] font-medium text-subtle'
  const lnk = 'link-u text-[14px] text-muted hover:text-fg'
  return (
    <footer className="relative z-10 border-t border-line bg-bg">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-muted">
            IT support and managed services for growing businesses in Arizona.
          </p>
          <div className="mt-6 flex gap-2">
            {[
              { href: contact.facebook, label: 'SuperCru on Facebook', I: Facebook },
              { href: contact.twitter, label: 'SuperCru on X (Twitter)', I: X },
            ].map(({ href, label, I }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted transition-[color,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:text-fg"
              >
                <I />
              </a>
            ))}
          </div>
        </div>
        <div>
          <p className={col}>Services</p>
          <ul className="space-y-2.5">
            {services.slice(0, 5).map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} onClick={go(`#${s.id}`)} className={lnk}>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={col}>Company</p>
          <ul className="space-y-2.5">
            {company.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={go(l.href)} className={lnk}>
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a href={contact.customerPortal} target="_blank" rel="noopener noreferrer" className={lnk}>
                Customer Portal
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className={col}>Visit</p>
          <address className="space-y-2.5 text-[14px] not-italic text-muted">
            <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer" className={`${lnk} block`}>
              {contact.address}
              <br />
              {contact.city}
            </a>
            <a href={contact.phoneHref} className={`${lnk} inline-block`}>
              {contact.phone}
            </a>
            <br />
            <a href={`mailto:${contact.email}`} className={`${lnk} inline-block`}>
              {contact.email}
            </a>
          </address>
        </div>
      </div>
      <div className="container-x flex flex-col justify-between gap-3 border-t border-line py-6 text-[13px] text-subtle sm:flex-row">
        <p>© {new Date().getFullYear()} SuperCru. All rights reserved.</p>
        <p>Tempe, Arizona</p>
      </div>
    </footer>
  )
}
