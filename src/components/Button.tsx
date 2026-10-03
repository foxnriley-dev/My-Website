import { animate, motion, useMotionValue, useSpring } from 'framer-motion'
import type { ReactNode, MouseEvent, PointerEvent } from 'react'
import { scrollToHash } from '../lib/smoothScroll'
import { useReducedMotion } from '../hooks/useMedia'

type Props = {
  children: ReactNode
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  onClick?: () => void
  external?: boolean
}

const spring = { type: 'spring', stiffness: 500, damping: 28, mass: 0.6 } as const

const variants = {
  primary:
    'bg-fg text-inverse shadow-soft hover:shadow-lift border border-transparent',
  secondary:
    'bg-elev text-fg border border-line-strong shadow-soft hover:shadow-lift hover:border-fg/25',
  ghost: 'bg-transparent text-fg border border-transparent hover:bg-fg/[0.05]',
}

const sizes = {
  sm: 'h-9 px-4 text-[14px]',
  md: 'h-12 px-6 text-[15px]',
}

export function Button({
  children,
  href,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  className = '',
  onClick,
  external,
}: Props) {
  const reduced = useReducedMotion()
  const magnetic = variant === 'primary' && !reduced
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(mx, { stiffness: 220, damping: 18, mass: 0.4 })
  const y = useSpring(my, { stiffness: 220, damping: 18, mass: 0.4 })
  const shineX = useMotionValue('-120%')
  const shineOpacity = useMotionValue(0)

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (!magnetic || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - (r.left + r.width / 2)) * 0.22)
    my.set((e.clientY - (r.top + r.height / 2)) * 0.3)
  }
  const onLeave = () => {
    mx.set(0)
    my.set(0)
  }
  const onDown = () => {
    if (reduced) return
    shineX.set('-120%')
    shineOpacity.set(1)
    animate(shineX, '120%', { duration: 0.55, ease: [0.22, 1, 0.36, 1] })
  }

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    onClick?.()
    if (href?.startsWith('#')) {
      e.preventDefault()
      scrollToHash(href)
    }
  }

  const cls = `group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-full font-medium tracking-[-0.01em] transition-[background-color,border-color,box-shadow,color] duration-300 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`

  const inner = (
    <>
      <motion.span
        aria-hidden
        style={{ x: shineX, opacity: shineOpacity }}
        className="pointer-events-none absolute inset-y-0 left-0 w-full bg-[linear-gradient(100deg,transparent_30%,rgb(255_255_255/0.28)_50%,transparent_70%)]"
      />
      <span className="relative z-[1] inline-flex items-center gap-2">{children}</span>
    </>
  )

  const motionProps = {
    style: magnetic ? { x, y } : undefined,
    whileHover: reduced ? undefined : { y: -2 },
    whileTap: { scale: 0.96 },
    transition: spring,
    onPointerMove: onMove,
    onPointerLeave: onLeave,
    onPointerDown: onDown,
    className: cls,
  }

  if (href) {
    return (
      <motion.a
        href={href}
        onClick={handleClick}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...motionProps}
      >
        {inner}
      </motion.a>
    )
  }
  return (
    <motion.button type={type} disabled={disabled} onClick={handleClick} {...motionProps}>
      {inner}
    </motion.button>
  )
}
