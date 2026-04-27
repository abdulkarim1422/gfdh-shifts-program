import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // Avoid EMFILE/inotify exhaustion on systems with low watcher limits.
      usePolling: true,
      interval: 1000,
    },
  },
})
