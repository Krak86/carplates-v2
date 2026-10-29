import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { minimal2023Preset } from '@vite-pwa/assets-generator/config'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { HtmlTagDescriptor, Plugin } from 'vite'
import { imagetools } from 'vite-imagetools'
import { VitePWA } from 'vite-plugin-pwa'

const DAY_S = 24 * 60 * 60
const BRAND_COLOR = '#1d4ed8'

// PDF/DOCX export is online-only: these libs (~1.5 MB) get `export-*` chunk names so the precache can skip them.
// Only list packages nothing else imports — a shared one would drag its export chunk into the main bundle.
// Never name a source module `export-*.ts` either: Rollup names its chunk after the file, the precache then skips it,
// and if the main app imports it the whole app is blank offline (was `lib/export-formats.ts`).
const EXPORT_LIB =
  /[\\/]node_modules[\\/](jspdf|docx|html2canvas|canvg|dompurify|jszip|fflate|fast-png|iobuffer|pako|core-js|@babel[\\/]runtime|raf|rgbcolor|stackblur-canvas|svg-pathdata|performance-now)[\\/]/

// Stable vendor chunks (a deploy that only touches app code keeps them cached) and pure-helper chunks per feature
// area (many lazy sections share these — one cacheable file per area instead of one tiny file per pair of sections).
// Only side-effect-free *.helpers / lib modules are grouped: grouping a component a lazy chunk shares with the entry
// would drag the whole group into the first load.
// Module ids are matched with forward slashes (normalised below), so one pattern covers Windows and POSIX paths.
const VENDOR_GROUPS: Array<[string, RegExp]> = [
  ['vendor-react', /\/node_modules\/(react|react-dom|scheduler|react-router)\//],
  ['vendor-query', /\/node_modules\/@tanstack\//],
  ['vendor-i18n', /\/node_modules\/(i18next|react-i18next)\//],
  // Zod core and its config get their own chunks: `jitless` is read when a schema is constructed, so `zod-config` must
  // evaluate before the chunk that builds the schemas (keep `@/lib/zod-config` the first import of `main.tsx`).
  ['vendor-zod', /\/node_modules\/zod\//],
  ['zod-config', /\/src\/lib\/zod-config\.ts$/]
]
const HELPER_GROUPS: Array<[string, RegExp]> = [
  ['helpers-ratings', /\/src\/components\/SafetyRatings\.(helpers|brands)\.ts$/],
  ['helpers-specs', /\/src\/components\/(RdwSpecs\.helpers|CO2Badge\.helpers|VdbChips\.helpers)\.ts$/],
  ['helpers-size', /\/src\/components\/size\/(VehicleSize\.helpers|fit)\.ts$/],
  ['helpers-value', /\/src\/components\/EstimatedValue\.helpers\.ts$/],
  ['helpers-origin', /\/src\/components\/OriginSection\.helpers\.ts$/],
  ['helpers-media', /\/src\/components\/(VideoReviews|ReviewLinks|PressReviews)\.helpers\.ts$/]
]
const CODE_GROUPS = [...VENDOR_GROUPS, ...HELPER_GROUPS]

// Persisted query data is only safe to restore while the response shapes it was saved under still hold.
const schemasSource = readFileSync(fileURLToPath(new URL('../../packages/shared/src/schemas.ts', import.meta.url)))
const OFFLINE_CACHE_BUSTER = createHash('sha1').update(schemasSource).digest('hex').slice(0, 12)

// The language dictionary and the hero photo are only requested after the entry script has run (a dynamic `import()` and a
// CSS background), one round trip late. Their hashed names exist only at build time, so this hook writes the hints into
// `index.html`: an inline script preloads the chunk of the language the visitor will get (same pick as `initialLang`
// in `src/i18n/index.ts` - keep them in step), plus a static preload for the first hero image.
const LANG_CHUNKS = ['ua', 'ru', 'en'] as const
const HERO_AVIF = /(^|\/)quilia-[^/]*-crop-[^/]*\.avif$/

function preloadHints(): Plugin {
  return {
    name: 'carplates-preload-hints',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx): HtmlTagDescriptor[] {
        const files = Object.values(ctx.bundle ?? {})
        const langUrls: Record<string, string> = {}
        for (const lang of LANG_CHUNKS) {
          const chunk = files.find(
            f => f.type === 'chunk' && f.facadeModuleId?.replaceAll('\\', '/').endsWith(`/src/i18n/${lang}.json`)
          )
          if (chunk) langUrls[lang] = `/${chunk.fileName}`
        }
        const tags: HtmlTagDescriptor[] = []
        if (langUrls.ua) {
          const script =
            `(function(m){try{var l=new URLSearchParams(location.search).get('lang');` +
            `if(!m[l]){try{l=localStorage.getItem('carplates.lang')}catch(e){l=null}` +
            `if(!m[l]){var n=navigator.language.slice(0,2);l=n==='ru'?'ru':n==='uk'||n==='ua'?'ua':'en'}}` +
            `var u=[m[l]];if(l!=='ua')u.push(m.ua);` +
            `u.forEach(function(h){if(!h)return;var k=document.createElement('link');k.rel='modulepreload';k.href=h;document.head.appendChild(k)})}catch(e){}})` +
            `(${JSON.stringify(langUrls)})`
          tags.push({ tag: 'script', children: script, injectTo: 'head' })
        }
        const hero = files.find(f => f.type === 'asset' && HERO_AVIF.test(f.fileName))
        if (hero) {
          tags.push({
            tag: 'link',
            attrs: {
              rel: 'preload',
              as: 'image',
              type: 'image/avif',
              href: `/${hero.fileName}`,
              fetchpriority: 'high'
            },
            injectTo: 'head'
          })
        }
        return tags
      }
    }
  }
}

export default defineConfig({
  define: {
    __OFFLINE_CACHE_BUSTER__: JSON.stringify(OFFLINE_CACHE_BUSTER)
  },
  plugins: [
    react(),
    tailwindcss(),
    imagetools(),
    preloadHints(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      // Icons, favicon.ico and apple-touch-icon are generated from public/logo.png — replace that file to rebrand.
      pwaAssets: {
        image: 'public/logo.png',
        htmlPreset: '2023',
        preset: {
          ...minimal2023Preset,
          maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: BRAND_COLOR } },
          apple: { ...minimal2023Preset.apple, resizeOptions: { background: BRAND_COLOR } }
        }
      },
      manifest: {
        name: 'Cars UA - пошук авто за номером та VIN',
        short_name: 'Cars UA',
        description: 'Пошук даних про транспортний засіб за номерним знаком або VIN-кодом.',
        lang: 'uk',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        // Neutral so the splash and task switcher don't flash blue; the runtime <meta theme-color> follows the theme.
        theme_color: '#ffffff'
      },
      workbox: {
        // No `webmanifest` here: the plugin precaches it itself, and a second entry with another revision
        // makes Workbox throw on startup, leaving a service worker that caches and serves nothing.
        globPatterns: ['**/*.{js,css,html,svg,ico,png,geojson}', 'assets/flag-*.webp'], // region flags (~40 KB) for the offline result card
        // Logos (~2 MB) are runtime-cached below; PDF fonts and export-* chunks (PDF/DOCX export) stay online-only.
        // So does the AR scan (needs the API to read plates): its detector worker, wasm runtime and ONNX model.
        // And the News / Bluesky / Stock side widgets: live third-party data, only mounted online after the first scroll.
        globIgnores: [
          'logos/**',
          'country-flags/**',
          'fonts/**',
          'models/**',
          'assets/export-*.js',
          'assets/plate-detector.worker-*.js',
          // On-device text translation (transformers.js): opened on demand, models come from Hugging Face.
          'assets/transformers.web-*.js',
          'assets/ArCameraDialog-*.js',
          'assets/NewsWidget-*.js',
          'assets/BlueskyWidget-*.js',
          'assets/StockWidget-*.js',
          // Sign-in and the paid-feature / admin pages need the API: Google's script, the session cookie and every
          // account call are online-only, so none of their lazy chunks are worth precaching.
          'assets/GoogleSignInButton-*.js',
          'assets/TelegramSignInButton-*.js',
          'assets/EmailSignInForm-*.js',
          'assets/EmailLinkRoute-*.js',
          'assets/AccountMenu-*.js',
          'assets/FeaturesRoute-*.js',
          'assets/SettingsRoute-*.js',
          'assets/ProfileRoute-*.js',
          'assets/AdminRoute-*.js',
          // The "test your car" racer is fetched on demand after an explicit confirmation, then runtime-cached (below).
          'assets/RaceGameModal-*.js',
          'assets/engine-*.js'
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/og\//, /^\/healthz/, /^\/sitemap\.xml$/, /^\/robots\.txt$/],
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
            // Country SVG flags (~0.8 MB for all, a few KB each) — only the ones actually seen get cached.
            urlPattern: ({ url, sameOrigin }): boolean => sameOrigin && url.pathname.startsWith('/country-flags/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'carplates-rt-country-flags',
              expiration: { maxEntries: 100, maxAgeSeconds: 365 * DAY_S },
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            // Greyscale "no photo" hero placeholders (~0.9 MB AVIF (+ WebP fallback) for all kinds) — only the ones actually seen get cached.
            urlPattern: ({ url, sameOrigin }): boolean => sameOrigin && url.pathname.startsWith('/kind/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'carplates-rt-kind-images',
              expiration: { maxEntries: 12, maxAgeSeconds: 365 * DAY_S },
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            // The racer's code (kept out of the precache) is cached once it has been opened, so the game then works offline.
            urlPattern: ({ url, sameOrigin }): boolean =>
              sameOrigin && /^\/assets\/(RaceGameModal|engine)-[^/]+\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'carplates-rt-race-code',
              expiration: { maxEntries: 6, maxAgeSeconds: 365 * DAY_S },
              cacheableResponse: { statuses: [200] }
            }
          },
          {
            // Also the racer's car sprites (~80) and region backdrops (~60): only the ones actually used get cached.
            urlPattern: ({ url, sameOrigin }): boolean =>
              sameOrigin && url.pathname.startsWith('/assets/') && /\.(webp|avif|jpe?g)$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'carplates-rt-backgrounds',
              expiration: { maxEntries: 200, maxAgeSeconds: 365 * DAY_S },
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
    // Supported-browser floor: Tailwind v4 (Safari 16.4 / Chrome 111 / Firefox 128) + AVIF + OffscreenCanvas.
    target: ['chrome111', 'edge111', 'firefox128', 'safari16.4'],
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Default `true` pulls shared deps (e.g. Vite's preload helper) into the export chunks, making them eager.
          includeDependenciesRecursively: false,
          groups: [
            {
              name: (moduleId: string): string | null => {
                const pkg = EXPORT_LIB.exec(moduleId)?.[1]
                if (pkg) return `export-${pkg.replace(/^@/, '').replace(/[\\/]/g, '-')}`
                const id = moduleId.replaceAll('\\', '/')
                return CODE_GROUPS.find(([, re]) => re.test(id))?.[0] ?? null
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
      '/og': { target: 'http://localhost:3000', changeOrigin: true },
      // generated by the API's SeoController (in production the API serves everything)
      '/sitemap.xml': { target: 'http://localhost:3000', changeOrigin: true },
      '/robots.txt': { target: 'http://localhost:3000', changeOrigin: true }
    },
    allowedHosts: true // or ['.ngrok-free.app'] to be specific
  }
})
