/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare const __OFFLINE_CACHE_BUSTER__: string

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_DISQUS_SHORT_NAME?: string
  readonly VITE_ENABLE_TELEMETRY?: string
  readonly VITE_POSTHOG_KEY?: string
  readonly VITE_POSTHOG_HOST?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_GIT_SHA?: string
  readonly VITE_GOOGLE_MAPS_EMBED_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
