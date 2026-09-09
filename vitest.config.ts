import { defineConfig } from 'vitest/config'

// Root Vitest config — aggregates the per-package suites that exist.
// Add a package's path here when it gains its own vitest.config.ts.
export default defineConfig({
  test: {
    projects: ['packages/shared', 'apps/web', 'apps/api', 'scripts']
  }
})
