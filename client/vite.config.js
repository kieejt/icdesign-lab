import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    // Proxying in dev makes the API same-origin, matching how nginx serves it in
    // production. Cookies and sendBeacon then behave identically in both.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    target: 'es2020',
    cssCodeSplit: true,
    // Source maps roughly double the deployed asset payload and expose the
    // original source; they are not worth shipping for a public site.
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 700,

    rollupOptions: {
      output: {
        /*
         * Split the heavy, rarely-changing dependencies into their own chunks.
         *
         * The important one is `sheets`: xlsx + jszip + file-saver are ~700 kB
         * and are only needed by two admin screens, but bundled together with
         * everything else they were downloaded by every public visitor. Keeping
         * them separate means the route that imports them pulls them in and
         * nobody else pays.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('xlsx') || id.includes('jszip') || id.includes('file-saver')) {
            return 'sheets'
          }
          if (id.includes('react-router')) return 'router'
          if (id.includes('i18next')) return 'i18n'
          if (id.includes('axios')) return 'http'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) {
            return 'react'
          }
          return 'vendor'
        },

        // Content-hashed filenames so every asset can be cached immutably.
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  esbuild: {
    // Strip debug output from production bundles.
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
    pure: ['console.debug'],
  },
})
