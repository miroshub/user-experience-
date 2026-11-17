import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// /api calls go to the Express server, so the browser sees one address and no CORS setup is needed
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
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
