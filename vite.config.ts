import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import * as path from 'path';


// https://vite.dev/config/

export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5173,

  },

  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),

    },

  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // Inline les images (logo ~258 Ko) en base64 dans le bundle : évite les requêtes
    // de fichiers séparés qui ne sont pas servis derrière le proxy du Code App déployé.
    assetsInlineLimit: 512 * 1024,
  }

});