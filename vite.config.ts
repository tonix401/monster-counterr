import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'
import { BASE_URL } from './src/constants/index'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  root: './',
  base: BASE_URL,
  publicDir: './src/public',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 14120,
    strictPort: true,
    origin: '',
    https: true,
  },
  preview: {
    port: 14120,
    strictPort: true,
    https: true,
  },
})
