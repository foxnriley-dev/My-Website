import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from './Button'
import { StaticNetwork } from './StaticNetwork'

const ease = [0.22, 1, 0.36, 1] as const
const item = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease } },
}

export function Hero({ use3D }: { use3D: boolean }) {
  return (
    <section id="top" className="relative flex min-h-[100svh] items-start lg:items-center">
      <div className="container-x grid w-full items-center gap-10 pb-[46svh] pt-32 lg:grid-cols-2 lg:pb-16 lg:pt-24">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } }}>
          <motion.p variants={item} className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-elev/70 px-3 py-1 text-[13px] text-muted backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            Apple Consultants Network member · Tempe, AZ
          </motion.p>
          <motion.h1 variants={item} className="display text-[3.1rem] sm:text-[4.25rem] lg:text-[5.25rem]">
            Your I.T.
            <br />
            Headquarters.
          </motion.h1>
          <motion.p variants={item} className="mt-6 max-w-[30rem] text-[1.125rem] leading-relaxed text-muted sm:text-[1.25rem]">
            Expert IT consulting for growing businesses in Arizona.
          </motion.p>
          <motion.div variants={item} className="mt-10 flex flex-wrap gap-3">
            <Button href="#contact">
              Contact us <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </Button>
            <Button href="#services" variant="secondary">
              Explore services
            </Button>
          </motion.div>
        </motion.div>

        {!use3D && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto w-[min(78vw,340px)] lg:static lg:w-full lg:max-w-[460px] lg:justify-self-end">
            <StaticNetwork className="w-full" />
          </div>
        )}
      </div>

      <div aria-hidden className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[12px] text-subtle lg:flex">
        <span>Scroll</span>
        <span className="relative h-8 w-px overflow-hidden bg-line-strong">
          <motion.span
            className="absolute inset-x-0 top-0 h-3 bg-fg/60"
            animate={{ y: [-12, 32] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </div>
    </section>
  )
}
