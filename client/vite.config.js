import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// /api calls go to the Express server, so the browser sees one address and no CORS setup is needed.
// The server's port comes from PORT in the project's .env (one level up), so changing it there moves both.
// Only keys starting with "PORT" are read from that file, so the secrets in it never reach the client.
// API_TARGET can point a second copy at another server (e.g. a test server on another port).
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, '..', 'PORT')
  const apiTarget = process.env.API_TARGET || `http://localhost:${rootEnv.PORT || 3000}`

  return {
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
  }
})
