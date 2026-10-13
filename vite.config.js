import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // One copy of three.js, so three-bvh-csg's geometry classes match the app's.
  resolve: { dedupe: ['three'] },
})