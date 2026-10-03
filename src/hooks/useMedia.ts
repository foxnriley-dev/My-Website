import { useSyncExternalStore } from 'react'

export function useMedia(query: string, serverValue = false) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')
export const useDarkMode = () => useMedia('(prefers-color-scheme: dark)')

/** Heuristic for devices that should get the static image instead of WebGL. */
export function isLowPowerDevice() {
  if (typeof window === 'undefined') return true
  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }
  if (nav.connection?.saveData) return true
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return true
  if (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency < 4) return true
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (!gl) return true
  } catch {
    return true
  }
  return false
}
