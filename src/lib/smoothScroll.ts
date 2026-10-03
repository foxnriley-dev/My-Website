import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null
const NAV_OFFSET = -80

export function startSmoothScroll() {
  if (lenis) return null
  lenis = new Lenis({ duration: 1.1, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (time: number) => lenis?.raf(time * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  const stop = () => {
    gsap.ticker.remove(tick)
    lenis?.destroy()
    lenis = null
  }
  return { lenis, stop }
}

/** Scroll to an in-page hash, smoothly when Lenis is running. */
export function scrollToHash(hash: string) {
  const el = hash === '#top' ? document.body : document.querySelector(hash)
  if (!el) return
  if (lenis) {
    lenis.scrollTo(el as HTMLElement, { offset: hash === '#top' ? 0 : NAV_OFFSET })
  } else {
    if (hash === '#top') window.scrollTo({ top: 0 })
    else el.scrollIntoView()
  }
  history.replaceState(null, '', hash)
  // Move focus for keyboard and screen reader users.
  if (el instanceof HTMLElement && hash !== '#top') {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    el.focus({ preventScroll: true })
  }
}

export { gsap, ScrollTrigger }
