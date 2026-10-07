import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { minimal2023Preset } from '@vite-pwa/assets-generator/config'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { imagetools } from 'vite-imagetools'
import { VitePWA } from 'vite-plugin-pwa'

const DAY_S = 24 * 60 * 60
const BRAND_COLOR = '#1d4ed8'

// PDF/DOCX export is online-only: these libs (~1.5 MB) get `export-*` chunk names so the precache can skip them.
// Only list packages nothing else imports — a shared one would drag its export chunk into the main bundle.
const EXPORT_LIB =
  /[\\/]node_modules[\\/](jspdf|docx|html2canvas|canvg|dompurify|jszip|fflate|fast-png|iobuffer|pako|core-js|@babel[\\/]runtime|raf|rgbcolor|stackblur-canvas|svg-pathdata|performance-now)[\\/]/

// Persisted query data is only safe to restore while the response shapes it was saved under still hold.
const schemasSource = readFileSync(fileURLToPath(new URL('../../packages/shared/src/schemas.ts', import.meta.url)))
const OFFLINE_CACHE_BUSTER = createHash('sha1').update(schemasSource).digest('hex').slice(0, 12)

export default defineConfig({
  define: {
    __OFFLINE_CACHE_BUSTER__: JSON.stringify(OFFLINE_CACHE_BUSTER)
  },
  plugins: [
    react(),
    tailwindcss(),
    imagetools(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // Icons, favicon.ico and apple-touch-icon are generated from public/favicon.svg — replace that file to rebrand.
      pwaAssets: {
        image: 'public/favicon.svg',
        htmlPreset: '2023',
        preset: {
          ...minimal2023Preset,
          maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: BRAND_COLOR } },
          apple: { ...minimal2023Preset.apple, resizeOptions: { background: BRAND_COLOR } }
        }
      },
      manifest: {
        name: 'Cars UA — пошук авто за номером та VIN',
        short_name: 'Cars UA',
        description: 'Пошук даних про транспортний засіб за номерним знаком або VIN-кодом.',
        lang: 'uk',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: BRAND_COLOR
      },
      workbox: {
        // No `webmanifest` here: the plugin precaches it itself, and a second entry with another revision
        // makes Workbox throw on startup, leaving a service worker that caches and serves nothing.
        globPatterns: ['**/*.{js,css,html,svg,ico,png,geojson}'],
        // Logos (6 MB) are runtime-cached below; PDF fonts and export-* chunks (PDF/DOCX export) stay online-only.
        // So does the AR scan (needs the API to read plates): its detector worker, wasm runtime and ONNX model.
        // And the News / Bluesky / Stock side widgets: live third-party data, only mounted online after the first scroll.
        globIgnores: [
          'logos/**',
          'fonts/**',
          'models/**',
          'assets/export-*.js',
          'assets/plate-detector.worker-*.js',
          'assets/ArCameraDialog-*.js',
          'assets/NewsWidget-*.js',
          'assets/BlueskyWidget-*.js',
          'assets/StockWidget-*.js',
          // Sign-in and the paid-feature / admin pages need the API: Google's script, the session cookie and every
          // account call are online-only, so none of their lazy chunks are worth precaching.
          'assets/GoogleSignInButton-*.js',
          'assets/AccountMenu-*.js',
          'assets/FeaturesRoute-*.js',
          'assets/SettingsRoute-*.js',
          'assets/AdminRoute-*.js'
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/og\//, /^\/healthz/],
        cleanupOutdatedCaches: true,
        // Without it the first-visit page stays uncontrolled until a reload, so its lazy chunks bypass the precache.
        // Updates still wait for the user's "Update" click (no skipWaiting), so this never swaps code mid-session.
        clientsClaim: true,
        // Runtime cache names share the `carplates-rt-` prefix so "clear offline data" can find them.
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }): boolean => sameOrigin && url.pathname.startsWith('/logos/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'carplates-rt-logos',
              expiration: { maxEntries: 100, maxAgeSeconds: 90 * DAY_S },
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            // Greyscale "no photo" hero placeholders (~1.3 MB for all kinds) — only the ones actually seen get cached.
            urlPattern: ({ url, sameOrigin }): boolean => sameOrigin && url.pathname.startsWith('/kind/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'carplates-rt-kind-images',
              expiration: { maxEntries: 12, maxAgeSeconds: 365 * DAY_S },
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            urlPattern: ({ url, sameOrigin }): boolean =>
              sameOrigin && url.pathname.startsWith('/assets/') && /\.(webp|avif|jpe?g)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'carplates-rt-backgrounds',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * DAY_S },
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            // upload.* (originals) and thumb.* (the resized images /api/wiki returns).
            // Always refetch in CORS mode (Wikimedia sends ACAO: *) — the hero's CSS background-image is a no-cors
            // request, and its opaque response would be uncacheable (or cost ~7 MB of quota each in Chrome).
            urlPattern: ({ url }): boolean => url.hostname.endsWith('.wikimedia.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'carplates-rt-wiki-images',
              fetchOptions: { mode: 'cors', credentials: 'omit' },
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * DAY_S },
              cacheableResponse: { statuses: [200] }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Default `true` pulls shared deps (e.g. Vite's preload helper) into the export chunks, making them eager.
          includeDependenciesRecursively: false,
          groups: [
            {
              name: (moduleId: string): string | null => {
                const pkg = EXPORT_LIB.exec(moduleId)?.[1]
                return pkg ? `export-${pkg.replace(/^@/, '').replace(/[\\/]/g, '-')}` : null
              }
            }
          ]
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      // dev: the API runs separately on :3000
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      // link-preview cards (rendered by the API) — lets you open /og/<plate>.png on :5173 too
      '/og': { target: 'http://localhost:3000', changeOrigin: true }
    },
    allowedHosts: true // or ['.ngrok-free.app'] to be specific
  }
})
