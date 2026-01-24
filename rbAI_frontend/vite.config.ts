import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Listen on all addresses (0.0.0.0) for Docker
    port: 5173,
    watch: {
      usePolling: true, // Enable polling for Docker volume changes
    },
  },
})
