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
