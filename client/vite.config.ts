/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    port: 5175,
    strictPort: true,
    // The API runs on 4100; proxying keeps the refresh cookie first-party in development.
    proxy: { '/api': { target: 'http://localhost:4100', changeOrigin: false } },
  },
  preview: { port: 5175, strictPort: true },
  build: {
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks cache well across deployments of the app code.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
            { name: 'ui', test: /node_modules[\\/](radix-ui|@radix-ui|lucide-react|sonner|cn|class-variance-authority)[\\/]/ },
            { name: 'vendor', test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
