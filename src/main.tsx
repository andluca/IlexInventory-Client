import React from 'react'
import ReactDOM from 'react-dom/client'
import Decimal from 'decimal.js'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'

// ---------------------------------------------------------------------------
// Fail-fast: VITE_API_BASE_URL is required (SPEC §2.10)
// ---------------------------------------------------------------------------
if (!import.meta.env.VITE_API_BASE_URL) {
  throw new Error(
    '[Ilex] VITE_API_BASE_URL is not set. ' +
      'Copy .env.example to .env.local and set VITE_API_BASE_URL to your server origin. ' +
      'Example: VITE_API_BASE_URL=http://localhost:8000/api/v1',
  )
}

// ---------------------------------------------------------------------------
// Decimal.js global config — applies to all formatters and <DecimalInput> consumers
// precision: 28 (well above numeric(14,4) + arithmetic overhead)
// rounding: ROUND_HALF_EVEN (banker's rounding — consistent with PostgreSQL numeric)
// ---------------------------------------------------------------------------
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN })

// ---------------------------------------------------------------------------
// Fonts — Inter (UI) + JetBrains Mono (data: SKUs, lots, money, timestamps)
// Design deviation #6: NOT Geist (the v0 prototype uses Geist; we don't).
// ---------------------------------------------------------------------------
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'

// ---------------------------------------------------------------------------
// Tailwind CSS (processed by PostCSS; includes global.css base styles)
// ---------------------------------------------------------------------------
import './theme/global.css'

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const root = document.getElementById('root')
if (!root) {
  throw new Error('[Ilex] Could not find #root element. Check index.html.')
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
