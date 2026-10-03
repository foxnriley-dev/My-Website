import {
  LifeBuoy,
  Laptop,
  Sparkles,
  Code2,
  Cable,
  Activity,
  Cloud,
  House,
  MapPin,
  Repeat,
  type LucideIcon,
} from 'lucide-react'

const map: Record<string, LucideIcon> = {
  support: LifeBuoy,
  apple: Laptop,
  creative: Sparkles,
  code: Code2,
  cable: Cable,
  monitor: Activity,
  cloud: Cloud,
  home: House,
  pin: MapPin,
  loop: Repeat,
}

export function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const C = map[name] ?? Sparkles
  return <C className={className} strokeWidth={1.6} aria-hidden />
}
