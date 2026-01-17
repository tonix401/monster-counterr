import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  root: './',
  base: '/app/',
  publicDir: './assets',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 14120,
    strictPort: true,
    origin: '',
  },
  preview: {
    port: 14121,
    strictPort: true,
  },
})
