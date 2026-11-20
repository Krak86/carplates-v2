import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineProject } from 'vitest/config'

import { i18nFallback } from './i18n-fallback-plugin'

export default defineProject({
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
