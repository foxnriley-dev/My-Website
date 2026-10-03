import { useRef, type PointerEvent } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { services, type Service } from '../content'
import { Icon } from './Icon'

function ServiceCard({ s, reduced }: { s: Service; reduced: boolean }) {
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 200, damping: 20 })
  const sry = useSpring(ry, { stiffness: 200, damping: 20 })
  const glow = useRef<HTMLDivElement>(null)

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (reduced || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    ry.set((px - 0.5) * 7)
    rx.set(-(py - 0.5) * 7)
    glow.current?.style.setProperty('--x', `${px * 100}%`)
    glow.current?.style.setProperty('--y', `${py * 100}%`)
  }
  const onLeave = () => {
    rx.set(0)
    ry.set(0)
  }

  return (
    <div data-service-card className="[perspective:1000px]">
      <motion.article
        id={s.id}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d' }}
        className="card group relative flex h-full flex-col overflow-hidden p-6 transition-[box-shadow,border-color] duration-300 hover:border-line-strong hover:shadow-lift"
      >
        <div
          ref={glow}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: 'radial-gradient(320px circle at var(--x,50%) var(--y,50%), var(--accent-soft), transparent 60%)' }}
        />
        <span className="relative mb-8 grid h-10 w-10 place-items-center rounded-[10px] border border-line bg-bg text-accent">
          <Icon name={s.icon} />
        </span>
        <h3 className="relative text-[17px] font-semibold tracking-[-0.02em]">{s.title}</h3>
        <p className="relative mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
      </motion.article>
    </div>
  )
}

export function Services({ reduced }: { reduced: boolean }) {
  return (
    <section id="services" className="relative py-28 sm:py-36">
      <div className="container-x">
        <div className="mb-14 max-w-2xl" data-reveal>
          <p className="eyebrow mb-4">Services</p>
          <h2 className="h2">Everything your business runs on, handled by one team.</h2>
          <p className="mt-5 text-[17px] leading-relaxed text-muted">
            From the cabling in your walls to the apps on your phone, SuperCru designs, installs, and supports it all.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <ServiceCard key={s.id} s={s} reduced={reduced} />
          ))}
        </div>
      </div>
    </section>
  )
}
