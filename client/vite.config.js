import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'

/*
 * Vite fingerprints files that JavaScript imports and rewrites <link href> in
 * index.html, but it leaves `imagesrcset` untouched, so the hero preload would
 * point at a source path that does not exist in the build. This rewrites any
 * `/src/...` URL in index.html to the fingerprinted file the build emitted for it
 * (the one HomePage imports), so the preload and the <img> request the same URL.
 */
function fingerprintHtmlAssets() {
  return {
    name: 'fingerprint-html-assets',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html // dev server: /src paths resolve as they are
        const emitted = new Map()
        for (const chunk of Object.values(ctx.bundle)) {
          for (const original of chunk.originalFileNames ?? []) emitted.set(`/${original}`, `/${chunk.fileName}`)
        }
        return html.replace(/\/src\/[\w./-]+\.(?:webp|png|jpe?g|svg|avif)/g, (url) => emitted.get(url) ?? url)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    fingerprintHtmlAssets(),
    /*
     * Pre-compress every text asset at build time.
     *
     * nginx otherwise gzips each response on the fly at level 6. Compressing once
     * at the maximum level costs nothing at runtime, produces smaller files, and
     * Brotli typically saves a further 15-20% over gzip on JS and CSS.
     */
    compression({ algorithms: ['gzip', 'brotliCompress'], threshold: 1024, exclude: [/\.(?:woff2?|png|jpe?g|webp|gif|avif)$/i] }),
  ],

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
         * The important ones are `sheets` (Excel import/export, two admin
         * screens) and `zip` (the gallery's album download). Bundled together
         * with everything else they were downloaded by every public visitor.
         * Keeping them separate means the route that imports them pulls them in
         * and nobody else pays.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          // Admin-only Excel import/export.
          if (/[\\/](read-excel-file|write-excel-file|fflate|saxen|unzipper-esm|worker-f)[\\/]/.test(id)) {
            return 'sheets'
          }
          // The gallery's "download album". Kept apart from the Excel code so a
          // visitor saving an album does not download the spreadsheet library.
          if (id.includes('jszip') || id.includes('file-saver')) return 'zip'
          if (id.includes('react-router')) return 'router'
          if (id.includes('i18next')) return 'i18n'
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
