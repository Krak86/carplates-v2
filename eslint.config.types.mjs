// Opt-in, type-checked lint pass. Slow (needs the TS program) — run via
// `pnpm lint:types`, not part of the default `pnpm lint`. Scoped to the
// server-side code where floating promises actually bite.
import base from './eslint.config.mjs'

export default [
  ...base,
  {
    files: ['apps/api/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error'
    }
  }
]
