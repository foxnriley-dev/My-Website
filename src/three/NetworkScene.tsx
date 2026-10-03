import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { sceneState, onSceneActive } from '../lib/sceneStore'
import { useDarkMode } from '../hooks/useMedia'

const N = 140
const SHAPES = 6 // sphere, scattered, sphere, grid, orbits, core

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function fibonacciSphere(r: number) {
  const out: THREE.Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2
    const rad = Math.sqrt(1 - y * y)
    const th = golden * i
    out.push(new THREE.Vector3(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r))
  }
  return out
}

function buildShapes() {
  const rand = rng(7)
  const sphere = fibonacciSphere(1.5)
  const scattered = sphere.map((p) => {
    const d = p.clone().normalize()
    const k = 2.2 + rand() * 2.6
    return new THREE.Vector3(d.x * k * 1.7, d.y * k * 0.9, d.z * k - 1.5)
  })
  const cols = 14
  const rows = 10
  const grid = Array.from({ length: N }, (_, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    const x = (c - (cols - 1) / 2) * 0.3
    const z = (r - (rows - 1) / 2) * 0.3
    return new THREE.Vector3(x, Math.sin(x * 1.3) * Math.cos(z * 1.3) * 0.12, z)
  })
  const rings: THREE.Vector3[] = []
  const ringDefs = [
    { r: 0.85, n: 30, tilt: 0.35, twist: 0 },
    { r: 1.4, n: 46, tilt: -0.5, twist: 1.1 },
    { r: 1.95, n: 64, tilt: 0.2, twist: 2.2 },
  ]
  const ringIndex: number[] = []
  ringDefs.forEach((d, ri) => {
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.PI / 2 + d.tilt, d.twist, 0))
    for (let j = 0; j < d.n; j++) {
      const a = (j / d.n) * Math.PI * 2
      rings.push(new THREE.Vector3(Math.cos(a) * d.r, Math.sin(a) * d.r, 0).applyMatrix4(m))
      ringIndex.push(ri)
    }
  })
  const core = fibonacciSphere(1.15)
  const shapes = [sphere, scattered, sphere, grid, rings, core]

  // Line topology per shape family.
  const spherePairs: number[] = []
  for (let i = 0; i < N; i++) {
    const near = sphere
      .map((p, j) => ({ j, d: p.distanceToSquared(sphere[i]) }))
      .filter((o) => o.j > i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
    near.forEach((o) => spherePairs.push(i, o.j))
  }
  const gridPairs: number[] = []
  for (let i = 0; i < N; i++) {
    if (i % cols < cols - 1) gridPairs.push(i, i + 1)
    if (i + cols < N) gridPairs.push(i, i + cols)
  }
  const ringPairs: number[] = []
  let start = 0
  ringDefs.forEach((d) => {
    for (let j = 0; j < d.n; j++) ringPairs.push(start + j, start + ((j + 1) % d.n))
    start += d.n
  })

  return { shapes, spherePairs, gridPairs, ringPairs }
}

const ease = (t: number) => t * t * (3 - 2 * t)
const lerpKeys = (keys: number[], p: number) => {
  const i = Math.min(Math.floor(p), keys.length - 1)
  const j = Math.min(i + 1, keys.length - 1)
  return THREE.MathUtils.lerp(keys[i], keys[j], ease(p - i))
}

function makeLines(pairs: number[]) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pairs.length * 3), 3))
  return geo
}

function Network({ dark, wrapper }: { dark: boolean; wrapper: HTMLDivElement | null }) {
  const { shapes, spherePairs, gridPairs, ringPairs } = useMemo(buildShapes, [])
  const group = useRef<THREE.Group>(null)
  const nodes = useRef<THREE.InstancedMesh>(null)
  const core = useRef<THREE.Mesh>(null)
  const phase = useRef(sceneState.phase)
  const tilt = useRef({ x: 0, y: 0 })
  const pos = useMemo(() => shapes[0].map((p) => p.clone()), [shapes])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const size = useThree((s) => s.size)
  const lastOpacity = useRef(-1)

  const lineSets = useMemo(
    () =>
      [
        { pairs: spherePairs, weight: (w: number[]) => w[0] + w[2] + w[5], base: 0.32 },
        { pairs: gridPairs, weight: (w: number[]) => w[3], base: 0.28 },
        { pairs: ringPairs, weight: (w: number[]) => w[4], base: 0.4 },
      ].map((s) => ({
        ...s,
        geo: makeLines(s.pairs),
        mat: new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }),
      })),
    [spherePairs, gridPairs, ringPairs],
  )

  const palette = useMemo(
    () => ({
      node: new THREE.Color(dark ? '#d6d6da' : '#3a3a40'),
      accent: new THREE.Color(dark ? '#8aa3c0' : '#4f6d8f'),
      line: new THREE.Color(dark ? '#9a9aa3' : '#55555b'),
    }),
    [dark],
  )

  useEffect(() => {
    const mesh = nodes.current
    if (!mesh) return
    for (let i = 0; i < N; i++) mesh.setColorAt(i, i % 9 === 0 ? palette.accent : palette.node)
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    lineSets.forEach((s) => s.mat.color.copy(palette.line))
  }, [palette, lineSets])

  useEffect(
    () => () =>
      lineSets.forEach((s) => {
        s.geo.dispose()
        s.mat.dispose()
      }),
    [lineSets],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const t = state.clock.elapsedTime
    phase.current = THREE.MathUtils.damp(phase.current, sceneState.phase, 4, dt)
    const p = THREE.MathUtils.clamp(phase.current, 0, SHAPES - 1)
    const i0 = Math.floor(p)
    const i1 = Math.min(i0 + 1, SHAPES - 1)
    const f = ease(p - i0)

    const w = Array.from({ length: SHAPES }, (_, k) => Math.max(0, 1 - Math.abs(p - k)))

    // Morph nodes between neighbouring shapes, with a gentle breathing offset.
    const a = shapes[i0]
    const b = shapes[i1]
    const mesh = nodes.current!
    for (let i = 0; i < N; i++) {
      const v = pos[i].lerpVectors(a[i], b[i], f)
      const breathe = Math.sin(t * 0.9 + i * 0.37) * 0.025
      v.multiplyScalar(1 + breathe)
      dummy.position.copy(v)
      dummy.scale.setScalar(i % 9 === 0 ? 1.45 : 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true

    for (const s of lineSets) {
      const op = s.weight(w) * s.base
      const line = s.geo
      if (op < 0.01) {
        s.mat.opacity = 0
        continue
      }
      s.mat.opacity = op
      const arr = line.attributes.position.array as Float32Array
      for (let k = 0; k < s.pairs.length; k++) {
        const v = pos[s.pairs[k]]
        arr[k * 3] = v.x
        arr[k * 3 + 1] = v.y
        arr[k * 3 + 2] = v.z
      }
      line.attributes.position.needsUpdate = true
      line.computeBoundingSphere()
    }

    // Layout: right column on desktop, centred and smaller on mobile.
    const desktop = size.width >= 1024
    const g = group.current!
    const x = desktop ? lerpKeys([2.15, 0, 2.2, 2.2, 2.2, 2.2], p) : 0
    const y = desktop ? 0 : lerpKeys([-1.55, 0, 0.95, 0.95, 0.95, 0.95], p)
    const sc = desktop ? lerpKeys([1, 1, 0.95, 1, 0.95, 0.95], p) : lerpKeys([0.66, 0.8, 0.62, 0.62, 0.62, 0.62], p)
    g.position.set(x, y, 0)
    g.scale.setScalar(sc)

    tilt.current.x = THREE.MathUtils.damp(tilt.current.x, sceneState.pointerY * 0.18, 3, dt)
    tilt.current.y = THREE.MathUtils.damp(tilt.current.y, sceneState.pointerX * 0.25, 3, dt)
    g.rotation.y = t * 0.07 + p * 0.9 + tilt.current.y
    g.rotation.x = 0.18 + w[3] * 0.38 + tilt.current.x
    g.rotation.z = w[4] * 0.12

    const c = core.current!
    const pulse = 1 + Math.sin(t * 2.2) * 0.035 * w[5]
    c.scale.setScalar(lerpKeys([0.95, 0.2, 0.85, 0.4, 0.62, 1.3], p) * pulse)
    c.rotation.x = t * 0.15 + p * 0.6
    c.rotation.y = t * 0.2

    // Canvas opacity: recede behind the services grid, fade out after the story.
    if (wrapper) {
      const op = lerpKeys([1, 0.38, 1, 1, 1, 1], p) * (1 - sceneState.exit)
      const rounded = Math.round(op * 100) / 100
      if (rounded !== lastOpacity.current) {
        wrapper.style.opacity = String(rounded)
        lastOpacity.current = rounded
      }
    }
  })

  return (
    <group ref={group}>
      <instancedMesh ref={nodes} args={[undefined, undefined, N]} frustumCulled={false}>
        <sphereGeometry args={[0.034, 12, 12]} />
        <meshStandardMaterial roughness={0.35} metalness={0.4} />
      </instancedMesh>
      {lineSets.map((s, k) => (
        <lineSegments key={k} geometry={s.geo} material={s.mat} frustumCulled={false} />
      ))}
      <mesh ref={core}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshPhysicalMaterial
          color={dark ? '#b8c0ca' : '#d9dde2'}
          metalness={1}
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.15}
          flatShading
          envMapIntensity={dark ? 1 : 1.15}
        />
      </mesh>
    </group>
  )
}

export default function NetworkScene() {
  const dark = useDarkMode()
  const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null)
  const [active, setActive] = useState(true)
  const [dpr, setDpr] = useState(2)

  useEffect(() => onSceneActive(setActive), [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      sceneState.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      sceneState.pointerY = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const accent = dark ? '#8aa3c0' : '#4f6d8f'

  return (
    <div
      ref={setWrapper}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ visibility: active ? 'visible' : 'hidden' }}
    >
      <Canvas
        dpr={[1, Math.min(dpr, 2)]}
        frameloop={active ? 'always' : 'never'}
        camera={{ position: [0, 0, 9], fov: 35 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} />
        <ambientLight intensity={dark ? 0.35 : 0.8} />
        <directionalLight position={[4, 5, 6]} intensity={dark ? 1.4 : 1.6} />
        <pointLight position={[-4, -2.5, 3]} intensity={18} color={accent} />
        <Environment key={dark ? 'dark' : 'light'} resolution={128} frames={1}>
          <color attach="background" args={[dark ? '#46494f' : '#f2f2f0']} />
          <Lightformer form="rect" intensity={2.2} position={[0, 4, 3]} scale={[8, 2, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
          <Lightformer form="rect" intensity={1.4} color={accent} position={[5, -1, 1]} rotation-y={-Math.PI / 2} scale={[5, 3, 1]} />
          <Lightformer form="ring" intensity={0.8} position={[0, -4, 2]} scale={2} />
        </Environment>
        <Network dark={dark} wrapper={wrapper} />
      </Canvas>
    </div>
  )
}
