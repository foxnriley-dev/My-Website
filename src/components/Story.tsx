import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { storySteps } from '../content'
import { gsap, ScrollTrigger } from '../lib/smoothScroll'
import { sceneState } from '../lib/sceneStore'
import { StaticNetwork } from './StaticNetwork'

const ease = [0.22, 1, 0.36, 1] as const

/** Pinned "how we work" section: the 3D scene stays fixed while steps advance. */
export function Story({ animated, staticArt }: { animated: boolean; staticArt: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const bars = useRef<(HTMLSpanElement | null)[]>([])
  const [step, setStep] = useState(0)

  useLayoutEffect(() => {
    if (!animated || !ref.current) return
    const n = storySteps.length
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: ref.current,
        start: 'top top',
        end: () => `+=${window.innerHeight * n * 0.85}`,
        pin: true,
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress
          sceneState.story = p
          setStep(Math.min(n - 1, Math.floor(p * n)))
          bars.current.forEach((b, i) => {
            if (b) b.style.transform = `scaleX(${gsap.utils.clamp(0, 1, p * n - i)})`
          })
        },
      })
    }, ref)
    return () => {
      ctx.revert()
      sceneState.story = 0
    }
  }, [animated])

  if (!animated) {
    return (
      <section id="story" className="py-28 sm:py-36">
        <div className="container-x grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-4">How we work</p>
            <ol className="space-y-10">
              {storySteps.map((s) => (
                <li key={s.kicker}>
                  <p className="mb-2 text-[13px] font-medium text-subtle">{s.kicker}</p>
                  <h3 className="text-[1.5rem] font-semibold tracking-[-0.025em]">{s.title}</h3>
                  <p className="mt-2 max-w-md text-[16px] leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
          <StaticNetwork className="mx-auto w-full max-w-[420px]" />
        </div>
      </section>
    )
  }

  const s = storySteps[step]
  return (
    <section id="story" ref={ref} className="relative h-[100svh] overflow-hidden" aria-label="How we work">
      <div className="container-x grid h-full items-end pb-14 lg:grid-cols-2 lg:items-center lg:pb-0">
        <div className="max-w-xl">
          <p className="eyebrow mb-6">How we work</p>
          <div className="relative min-h-[220px] sm:min-h-[240px]" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
                transition={{ duration: 0.45, ease }}
              >
                <p className="mb-3 text-[13px] font-medium text-subtle">{s.kicker}</p>
                <h2 className="display text-[2.25rem] sm:text-[3.25rem]">{s.title}</h2>
                <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">{s.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-10 flex gap-2" aria-hidden>
            {storySteps.map((st, i) => (
              <span key={st.kicker} className="relative h-[3px] w-12 overflow-hidden rounded-full bg-line-strong">
                <span
                  ref={(el) => {
                    bars.current[i] = el
                  }}
                  className="absolute inset-0 origin-left rounded-full bg-fg"
                  style={{ transform: 'scaleX(0)' }}
                />
              </span>
            ))}
          </div>
        </div>
        {staticArt && (
          <motion.div
            className="hidden lg:block"
            animate={{ rotate: step * 24, scale: 1 - step * 0.03 }}
            transition={{ duration: 0.8, ease }}
          >
            <StaticNetwork className="mx-auto w-full max-w-[420px]" />
          </motion.div>
        )}
      </div>
    </section>
  )
}
