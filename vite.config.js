import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Two builds from one engine:
//   `vite build`            -> NFL game, dist/      (unchanged, default)
//   `vite build --mode cfb` -> CFB game, dist-cfb/  (entry cfb.html, renamed
//                              to index.html by the npm script afterwards)
// Mode `cfb` also loads .env.cfb, which sets VITE_SPORT=cfb and the CFB site
// URL on top of the shared .env (Supabase keys etc.).
export default defineConfig(({ mode }) => ({
  // relative base so the build works both on a GitHub Pages subpath and a
  // custom domain at the root.
  base: './',
  plugins: [react()],
  resolve: {
    // Hard sport separation: each build resolves './sport.js' to a module
    // importing ONLY its own sport config, so no NFL strings ship in the
    // CFB bundle and vice versa. (src/sport.js itself is only used by the
    // node test scripts, which switch on the VITE_SPORT env var.)
    alias: [
      {
        // match the WHOLE specifier so the replacement fully swaps it
        find: /^.*[\\/]sport\.js$/,
        replacement: fileURLToPath(
          new URL(
            mode === 'cfb' ? './src/sport.cfb.js' : './src/sport.nfl.js',
            import.meta.url,
          ),
        ),
      },
    ],
  },
  ...(mode === 'cfb'
    ? {
        // CFB ships its own static assets (players_cfb.json, og image,
        // robots/sitemap) — keeps the 3MB NFL players.json out of its dist.
        publicDir: 'public-cfb',
        build: {
          outDir: 'dist-cfb',
          rollupOptions: { input: 'cfb.html' },
        },
      }
    : {}),
}))
