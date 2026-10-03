# My Website

A fast, dependency-free personal portfolio site — pure HTML, CSS and JavaScript.

## Features
- Animated aurora gradient background that follows the cursor
- Staggered headline intro, scroll reveals, and word-by-word text highlighting
- 3D tilt + spotlight project cards, magnetic buttons, custom cursor (desktop)
- Animated stat counters, infinite marquee, live local-time footer clock
- Fully responsive with a mobile menu; respects `prefers-reduced-motion`

## Run locally
Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

## Customize
- **Name, copy, projects, email:** edit `index.html`
- **Colors & fonts:** CSS variables at the top of `styles.css`
- **Background colors:** the `blobs` array in `script.js`

## Deploy
Enable GitHub Pages (Settings → Pages → deploy from branch, root folder) and the site goes live as-is.
