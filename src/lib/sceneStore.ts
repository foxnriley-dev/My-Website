// Shared, mutable state between ScrollTrigger (DOM side) and the R3F scene.
// Kept outside React so per-frame reads don't cause re-renders.
//
// `phase` walks through the scene's shapes:
//   0 sphere (hero) → 1 scattered (services) → 2 sphere → 3 grid → 4 orbits → 5 core (story)
type Listener = (active: boolean) => void

export const sceneState = {
  hero: 0,
  storyEnter: 0,
  story: 0,
  exit: 0,
  pointerX: 0,
  pointerY: 0,
  get phase() {
    return this.hero + this.storyEnter + this.story * 3
  },
}

let active = true
const listeners = new Set<Listener>()

export function setSceneActive(next: boolean) {
  if (next === active) return
  active = next
  listeners.forEach((l) => l(active))
}

export function onSceneActive(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
