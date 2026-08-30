import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this as a project site under /Expenditrack1/, not
  // the domain root, so asset and route URLs need that prefix baked in.
  base: process.env.GITHUB_PAGES ? '/Expenditrack1/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Without this, Rollup's automatic chunking is free to fold a large lazy-route
        // dependency (recharts) into the eager entry bundle once enough new dynamic-import
        // boundaries (the WebGL 3D chart engine below) get added to the graph — it did,
        // ~600KB worth. Pinning the biggest libraries to their own named chunks keeps the
        // entry bundle stable regardless of how the rest of the graph shifts.
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'recharts'
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'chart3d-engine'
          if (id.includes('node_modules/xlsx')) return 'xlsx'
        },
      },
    },
  },
})
