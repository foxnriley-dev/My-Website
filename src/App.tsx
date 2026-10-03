import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Capabilities } from './components/Capabilities'
import { Services } from './components/Services'
import { Story } from './components/Story'
import { Apple } from './components/Apple'
import { Why } from './components/Why'
import { Support } from './components/Support'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { useReducedMotion, isLowPowerDevice } from './hooks/useMedia'
import { gsap, ScrollTrigger, startSmoothScroll, scrollToHash } from './lib/smoothScroll'
import { sceneState, setSceneActive } from './lib/sceneStore'

const NetworkScene = lazy(() => import('./three/NetworkScene'))

/** Defer the WebGL bundle until the browser is idle after first paint. */
function useIdle() {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: typeof requestIdleCallback }
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setIdle(true), { timeout: 1500 })
      return () => w.cancelIdleCallback(id)
    }
    const t = setTimeout(() => setIdle(true), 300)
    return () => clearTimeout(t)
  }, [])
  return idle
}

export default function App() {
  const reduced = useReducedMotion()
  const lowPower = useMemo(isLowPowerDevice, [])
  const use3D = !reduced && !lowPower
  const animated = !reduced
  const idle = useIdle()

  useEffect(() => {
    if (reduced) return
    const s = startSmoothScroll()
    return () => s?.stop()
  }, [reduced])

  useEffect(() => {
    if (location.hash.length > 1) requestAnimationFrame(() => scrollToHash(location.hash))
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
  }, [])

  useLayoutEffect(() => {
    if (!animated) return
    const ctx = gsap.context(() => {
      if (use3D) {
        const track = (key: 'hero' | 'storyEnter' | 'exit', trigger: string, start: string, end: string) =>
          ScrollTrigger.create({
            trigger,
            start,
            end,
            onUpdate: (self) => {
              sceneState[key] = self.progress
              if (key === 'exit') setSceneActive(self.progress < 1)
            },
            onRefresh: (self) => {
              sceneState[key] = self.progress
            },
          })
        track('hero', '#top', 'top top', 'bottom top')
        track('storyEnter', '#story', 'top bottom', 'top top')
        track('exit', '#apple', 'top bottom', 'top 35%')
      }

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          y: 28,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        })
      })

      gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((group) => {
        gsap.from(group.querySelectorAll('[data-stagger-item]'), {
          y: 36,
          opacity: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: { trigger: group, start: 'top 85%', once: true },
        })
      })

      // Service cards: tilt up out of the page in a staggered wave.
      const cards = gsap.utils.toArray<HTMLElement>('[data-service-card] > article')
      gsap.set(cards, { opacity: 0, y: 70, rotateX: 22, transformOrigin: '50% 100%' })
      ScrollTrigger.batch(cards, {
        start: 'top 92%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 1.1,
            ease: 'power3.out',
            stagger: 0.08,
            clearProps: 'transform',
          }),
      })
      // Gentle column parallax while the grid scrolls past.
      gsap.utils.toArray<HTMLElement>('[data-service-card]').forEach((el, i) => {
        gsap.fromTo(
          el,
          { y: (i % 4) * 14 },
          { y: -(i % 4) * 14, ease: 'none', scrollTrigger: { trigger: '#services', start: 'top bottom', end: 'bottom top', scrub: true } },
        )
      })

      ScrollTrigger.sort()
      ScrollTrigger.refresh()
    })
    return () => ctx.revert()
  }, [animated, use3D])

  return (
    <MotionConfig reducedMotion="user">
      {use3D && idle && (
        <Suspense fallback={null}>
          <NetworkScene />
        </Suspense>
      )}
      <Nav />
      <main id="main" className="relative z-10">
        <Hero use3D={use3D} />
        <Capabilities reduced={reduced} />
        <Services reduced={reduced} />
        <Story animated={animated} staticArt={!use3D} />
        <Apple />
        <Why />
        <Support />
        <Contact />
      </main>
      <Footer />
    </MotionConfig>
  )
}
