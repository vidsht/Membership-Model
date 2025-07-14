import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({
    include: "**/*.{jsx,js}",
  })],
  esbuild: {
    include: /src\/.*\.(jsx?|tsx?)$/,
    exclude: [],
    jsx: 'automatic'
  },  server: {
    port: 3001, // Frontend development server port
    cors: {
      origin: 'http://localhost:3001',
      credentials: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'build',
  }
})
