import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Scinde le bundle : vendor (React) séparé du code applicatif.
    // Objectif : aucun fichier > ~140 Ko pour réduire le throttling
    // Dataverse pendant `pac pages upload-code-site`.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
