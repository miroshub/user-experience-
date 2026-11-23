import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// /api calls go to the Express server, so the browser sees one address and no CORS setup is needed.
// API_TARGET can point a second copy at another server (e.g. a test server on another port).
const apiTarget = process.env.API_TARGET || 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': apiTarget,
      // the live chat socket goes to the same server
      '/socket.io': { target: apiTarget, ws: true },
    },
  },
  // Client tests: a fake browser (jsdom) + React Testing Library
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
