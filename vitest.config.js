import { defineConfig } from 'vitest/config'

// Vitest runs in `mode: 'test'`, so vite.config.js's env guard is skipped.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    // Dummy Supabase env so auth.js (createClient at import time) doesn't throw.
    // createClient does no network I/O on construction, so this is inert.
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
