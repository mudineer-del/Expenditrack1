import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProviders } from '@/providers/AppProviders'
// Side-effect import: applies the saved color palette/card scale to <html>
// before the first paint, so there's no flash of the default theme.
import '@/store/useDisplayStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)

// Register Service Worker for PWA support. Uses BASE_URL (Vite's configured
// `base`, e.g. "/Expenditrack1/" on GitHub Pages vs "/" locally) rather than
// a bare "/sw.js" — this is a GitHub Pages *project* site served from a
// subpath, so an absolute-root registration 404s outright, and a plain
// relative "sw.js" would resolve against whatever route the SPA happens to
// be on (e.g. "/Expenditrack1/invoices/sw.js" on a hard refresh there).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        console.log('[PWA] Service Worker registered:', registration);
        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });
  });
}
