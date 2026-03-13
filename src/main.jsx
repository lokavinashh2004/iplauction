import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { runVersionLockOnLoad } from './useVersionCheck.js'

// ── Version lock ──────────────────────────────────────────────────────────────
// Runs immediately on every page load.
// If the cached version.json differs from localStorage → reload to get fresh JS.
// This is async and non-blocking; if the network is unavailable it does nothing.
runVersionLockOnLoad();
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
