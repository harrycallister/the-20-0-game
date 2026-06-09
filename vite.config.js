import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // relative base so the build works both on a GitHub Pages subpath and a
  // future custom domain at the root.
  base: './',
  plugins: [react()],
})
