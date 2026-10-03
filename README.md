# SuperCru website

Redesigned marketing site for [SuperCru](https://supercru.com), an IT support and managed services company in Tempe, AZ.

**Stack:** Vite, React, TypeScript, Tailwind CSS v4, Three.js (`@react-three/fiber` + `drei`), GSAP ScrollTrigger, Lenis and Framer Motion.

## Develop

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check, then output a static site to dist/
npm run preview   # serve dist/ locally
```

`dist/` is fully static, with relative asset paths, so it can be hosted anywhere: Netlify, Vercel, S3, or GitHub Pages. The included workflow (`.github/workflows/deploy.yml`) publishes to GitHub Pages on every push to `main`. To use it, set **Settings → Pages → Source** to **GitHub Actions**.

## Editing content

All copy, services, links, and contact details are in `src/content.ts`.

## Contact form

With no configuration, submitting the form opens the visitor's email app with the message pre-filled to info@supercru.com. To deliver submissions directly instead, set a form endpoint at build time (for example Formspree or Basin) that accepts JSON `{ name, email, message }`:

```sh
VITE_CONTACT_ENDPOINT=https://formspree.io/f/xxxxxx npm run build
```

## How the 3D works

- `src/three/NetworkScene.tsx`: a single fixed canvas with a node network that morphs between shapes (sphere, then scattered, sphere, grid, orbits, and core). It is lazy-loaded once the browser is idle, and its device pixel ratio is capped at 2.
- `src/lib/sceneStore.ts`: scroll progress that ScrollTrigger writes and the scene reads every frame, without React re-renders.
- `src/components/Story.tsx`: the pinned "How we work" section that drives shapes 2–5.
- Low-power devices (save-data, fewer than 4 cores, under 4 GB of memory, or no WebGL) get a static SVG instead (`StaticNetwork.tsx`). Users with `prefers-reduced-motion` get the static SVG, no Lenis, no pinning, and no scroll animation.
