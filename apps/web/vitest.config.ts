import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineProject } from 'vitest/config'

import { i18nFallback } from './i18n-fallback-plugin.ts'
import { latestReleaseDate } from './latest-release-date.ts'

export default defineProject({
  define: { __LATEST_RELEASE_DATE__: JSON.stringify(latestReleaseDate()) },
  plugins: [react(), i18nFallback()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  test: {
    name: 'web',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}']
  }
})
