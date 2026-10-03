import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `base: './'` keeps asset paths relative so dist/ works from any host or sub-path.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // three.js is only loaded lazily (see App.tsx), so its chunk size is acceptable.
    chunkSizeWarningLimit: 1100,
  },
})
