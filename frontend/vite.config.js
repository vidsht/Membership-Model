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
  },
  server: {
    port: 3001, // Frontend development server port
    cors: {
      origin: 'http://localhost:3001',
      credentials: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'build',
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          utils: ['react-helmet-async']
        },
        // Enhanced cache busting with timestamps
        chunkFileNames: (chunkInfo) => {
          const hash = chunkInfo.facadeModuleId ? 
            `${Date.now()}-[hash]` : '[hash]';
          return `assets/js/[name]-${hash}.js`;
        },
        entryFileNames: `assets/js/[name]-${Date.now()}-[hash].js`,
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          const timestamp = Date.now();
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/css/[name]-${timestamp}-[hash].${ext}`;
          }
          if (/\.(woff|woff2|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `assets/fonts/[name]-${timestamp}-[hash].${ext}`;
          }
          if (/\.(png|jpg|jpeg|gif|svg|webp|avif)$/.test(assetInfo.name)) {
            return `assets/images/[name]-${timestamp}-[hash].${ext}`;
          }
          return `assets/[ext]/[name]-${timestamp}-[hash].${ext}`;
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
  // Enhanced cache busting for development
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_VERSION__: JSON.stringify(Date.now().toString())
  },
  // Prevent automatic service worker registration
  worker: {
    format: 'es'
  }
})
