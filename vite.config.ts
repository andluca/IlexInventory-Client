import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy /api/* to the BE so the FE and BE share an origin in dev.
      // Required because apiClient uses credentials: 'include', which the
      // CORS spec disallows when Access-Control-Allow-Origin is '*'.
      // VITE_API_BASE_URL stays as a relative path (/api/v1) so requests
      // hit the dev server and get forwarded here.
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // Rewrite the Origin header to the proxy target so Django's CSRF
        // Origin/Referer check passes on browser POST/PATCH/DELETE in dev.
        // changeOrigin only updates Host; Origin is sent separately.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const target = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000'
            proxyReq.setHeader('Origin', target)
          })
        },
      },
    },
  },
})
