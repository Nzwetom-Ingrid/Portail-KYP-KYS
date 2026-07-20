import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Chemins d'assets RELATIFS (./fichier.js) au lieu d'absolus (/assets/...).
  base: './',
  plugins: [react()],
  build: {
    // PAS de sous-dossier "assets/" : pac aplatit les web files (partialurl =
    // nom de fichier seul, ex. /index-bpzdfln1.js). Si Vite garde dist/assets/,
    // index.html demande /assets/index-... → 404. assetsDir:'' aligne les deux.
    assetsDir: '',
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
