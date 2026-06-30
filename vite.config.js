import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Fail the build early if required Supabase env vars are missing, rather than
  // shipping a bundle that throws at runtime in auth.js.
  if (mode !== 'test' && (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)) {
    throw new Error(
      '[vite] Missing required env vars VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env and fill them in.'
    )
  }

  return {
    plugins: [react(), tailwindcss()],
    build: {
      // Don't ship source maps to production (avoids leaking original source).
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
    },
  }
})
