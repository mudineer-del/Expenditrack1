import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * Second, separate build target for the "Save as HTML" / standalone-export
 * feature (Phase 7). Produces one fully self-contained HTML file (all JS/CSS
 * inlined, no external references) that can be opened by double-click with
 * no dev server and no hosting. Runs before the main `vite build` — see the
 * "build:singlefile" step in package.json — and its output is copied into
 * `public/` so the main build ships it as a static asset at /ogdcl-singlefile.html.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    outDir: 'singlefile-dist',
    emptyOutDir: true,
  },
})
