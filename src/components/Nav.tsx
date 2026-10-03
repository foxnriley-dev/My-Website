import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ArrowUpRight } from 'lucide-react'
import { Logo } from './Logo'
import { Button } from './Button'
import { Icon } from './Icon'
import { contact, nav, services } from '../content'
import { scrollToHash } from '../lib/smoothScroll'

const ease = [0.22, 1, 0.36, 1] as const

function go(e: MouseEvent, href: string, after?: () => void) {
  e.preventDefault()
  after?.()
  scrollToHash(href)
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [svcOpen, setSvcOpen] = useState(false)
  const [mobileSvc, setMobileSvc] = useState(false)
  const svcRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number>(undefined)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menus on Escape / outside click.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSvcOpen(false)
        setOpen(false)
      }
    }
    const onDown = (e: PointerEvent) => {
      if (svcRef.current && !svcRef.current.contains(e.target as Node)) setSvcOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }, [open])

  const hoverOpen = () => {
    window.clearTimeout(closeTimer.current)
    setSvcOpen(true)
  }
  const hoverClose = () => {
    closeTimer.current = window.setTimeout(() => setSvcOpen(false), 140)
  }

  const linkCls = 'link-u text-[14px] text-muted hover:text-fg'
  const solid = scrolled || open

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        solid ? 'border-b border-line bg-[var(--nav-glass)] backdrop-blur-xl backdrop-saturate-150' : 'border-b border-transparent'
      }`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-inverse"
      >
        Skip to content
      </a>
      <nav className="container-x flex h-16 items-center justify-between gap-6" aria-label="Primary">
        <a href="#top" onClick={(e) => go(e, '#top')} aria-label="SuperCru home" className="rounded-lg">
          <Logo />
        </a>

        <div className="hidden items-center gap-7 lg:flex">
          {nav.primary.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)} className={linkCls}>
              {l.label}
            </a>
          ))}

          <div ref={svcRef} className="relative" onPointerEnter={hoverOpen} onPointerLeave={hoverClose}>
            <button
              type="button"
              className={`${linkCls} inline-flex items-center gap-1`}
              aria-expanded={svcOpen}
              aria-controls="services-menu"
              onClick={() => setSvcOpen((v) => !v)}
            >
              Services
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${svcOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            <AnimatePresence>
              {svcOpen && (
                <motion.div
                  id="services-menu"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.22, ease }}
                  className="card absolute left-1/2 top-full mt-3 w-[620px] -translate-x-1/2 p-2 shadow-lift"
                >
                  <ul className="grid grid-cols-2 gap-1">
                    {services.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          onClick={(e) => go(e, `#${s.id}`, () => setSvcOpen(false))}
                          className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] text-muted transition-colors hover:bg-fg/[0.04] hover:text-fg"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line text-accent">
                            <Icon name={s.icon} className="h-4 w-4" />
                          </span>
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {nav.secondary.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)} className={linkCls}>
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button href={contact.customerPortal} external variant="ghost" size="sm">
            Sign In
          </Button>
          <Button href="#contact" size="sm">
            Contact Us
          </Button>
        </div>

        <button
          type="button"
          className="relative grid h-10 w-10 place-items-center rounded-full lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="relative block h-3 w-5">
            <motion.span
              className="absolute left-0 top-0 h-[1.5px] w-5 rounded bg-fg"
              animate={open ? { y: 5.25, rotate: 45 } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.3, ease }}
            />
            <motion.span
              className="absolute bottom-0 left-0 h-[1.5px] w-5 rounded bg-fg"
              animate={open ? { y: -5.25, rotate: -45 } : { y: 0, rotate: 0 }}
              transition={{ duration: 0.3, ease }}
            />
          </span>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '100dvh' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease }}
            className="overflow-y-auto bg-bg lg:hidden"
          >
            <motion.ul
              className="container-x flex flex-col pb-40 pt-4"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } } }}
            >
              {[...nav.primary, { label: 'Services', href: '' }, ...nav.secondary].map((l) => (
                <motion.li
                  key={l.label}
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.35, ease }}
                  className="border-b border-line"
                >
                  {l.href ? (
                    <a
                      href={l.href}
                      onClick={(e) => go(e, l.href, () => setOpen(false))}
                      className="block py-4 text-[22px] font-medium tracking-[-0.02em]"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-expanded={mobileSvc}
                        onClick={() => setMobileSvc((v) => !v)}
                        className="flex w-full items-center justify-between py-4 text-left text-[22px] font-medium tracking-[-0.02em]"
                      >
                        Services
                        <ChevronDown className={`h-5 w-5 transition-transform ${mobileSvc ? 'rotate-180' : ''}`} aria-hidden />
                      </button>
                      <AnimatePresence initial={false}>
                        {mobileSvc && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease }}
                            className="overflow-hidden"
                          >
                            {services.map((s) => (
                              <li key={s.id}>
                                <a
                                  href={`#${s.id}`}
                                  onClick={(e) => go(e, `#${s.id}`, () => setOpen(false))}
                                  className="block py-2.5 pl-1 text-[16px] text-muted"
                                >
                                  {s.title}
                                </a>
                              </li>
                            ))}
                            <li className="h-3" />
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </motion.li>
              ))}
              <motion.li
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                className="mt-8 flex flex-col gap-3"
              >
                <Button href="#contact" onClick={() => setOpen(false)} className="w-full">
                  Contact Us
                </Button>
                <Button href={contact.customerPortal} external variant="secondary" className="w-full">
                  Customer Portal Sign In <ArrowUpRight className="h-4 w-4" aria-hidden />
                </Button>
              </motion.li>
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
