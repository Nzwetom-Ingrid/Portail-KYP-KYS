import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import * as path from 'path';


// https://vite.dev/config/

export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5173,

  },

  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
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

  }

});