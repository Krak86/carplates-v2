import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import prettier from 'eslint-config-prettier'
import drizzle from 'eslint-plugin-drizzle'
import importX from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

import { noExternalAfterInternal } from './eslint-rules/import-order.mjs'
import { noBareUseStore } from './eslint-rules/no-bare-usestore.mjs'
import { noRawConsole } from './eslint-rules/no-raw-console.mjs'

const localPlugins = {
  'import-rules': { rules: { 'no-external-after-internal': noExternalAfterInternal } },
  'store-rules': { rules: { 'no-bare-usestore': noBareUseStore } },
  'console-rules': { rules: { 'no-raw-console': noRawConsole } }
}

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.cache/**',
      '**/coverage/**',
      '**/.vite/**',
      'eslint-rules/**',
      'infra/db/migrations/**'
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  importX.configs['flat/recommended'],
  importX.configs['flat/typescript'],

  // ---- all TypeScript, every package ---------------------------------------
  {
    files: ['**/*.{ts,tsx}'],
    plugins: localPlugins,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module'
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          noWarnOnMultipleProjects: true,
          project: ['packages/*/tsconfig.json', 'apps/*/tsconfig.json', 'scripts/tsconfig.json']
        }
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports', disallowTypeAnnotations: false }
      ],
      // noisy, low-signal on namespace-style default exports (i18next, tseslint, …)
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          caughtErrorsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      'import-rules/no-external-after-internal': 'warn',
      'console-rules/no-raw-console': 'warn',
      // phantom-dependency guard — an import that resolves via the hoisted tree
      // but is not declared in the nearest package.json. tsc does not replicate
      // no-extraneous-dependencies; includeTypes covers `import type … from 'x'`.
      'import-x/no-unresolved': 'warn',
      'import-x/no-extraneous-dependencies': ['warn', { devDependencies: true, includeTypes: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='forwardRef']",
          message: 'forwardRef is removed in React 19 — use ref-as-prop: ref?: React.Ref<T> in Props.'
        },
        {
          selector: "CallExpression[callee.object.name='React'][callee.property.name='forwardRef']",
          message: 'forwardRef is removed in React 19 — use ref-as-prop: ref?: React.Ref<T> in Props.'
        }
      ]
    }
  },

  // apps/web has an @/ alias, so parent-relative traversal there is a smell.
  // Node ESM code (api, scripts, db) legitimately uses ../ and is exempt.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    ignores: ['apps/web/**/index.ts', 'apps/web/**/index.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['../*'], message: 'Use the @/ alias instead of parent-relative imports.' }] }
      ]
    }
  },

  // ---- apps/web : React 19 hooks + TanStack Query -----------------------------
  // eslint-plugin-react is omitted: 7.37.x calls context.getFilename(), removed
  // in ESLint 10. react-hooks (incl. the React Compiler family) covers what
  // matters here.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, ...localPlugins },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/incompatible-library': 'warn',
      // off to avoid churn on legacy patterns — enforced by hand per CLAUDE_RULES.md
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'store-rules/no-bare-usestore': 'error'
    }
  },
  {
    ...pluginQuery.configs['flat/recommended'][0],
    files: ['apps/web/**/*.{ts,tsx}']
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      '@tanstack/query/exhaustive-deps': 'off',
      '@tanstack/query/no-rest-destructuring': 'error',
      '@tanstack/query/stable-query-client': 'error',
      '@tanstack/query/no-unstable-deps': 'error',
      '@tanstack/query/no-void-query-fn': 'error',
      '@tanstack/query/infinite-query-property-order': 'error',
      '@tanstack/query/mutation-property-order': 'error',
      '@tanstack/query/prefer-query-options': 'error'
    }
  },

  // ---- apps/api : Node + Drizzle write guards --------------------------------
  {
    files: ['apps/api/**/*.ts'],
    plugins: { drizzle },
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'drizzle/enforce-delete-with-where': ['error', { drizzleObjectName: ['db', 'tx'] }],
      'drizzle/enforce-update-with-where': ['error', { drizzleObjectName: ['db', 'tx'] }],
      // Nest DI + emitDecoratorMetadata needs constructor-injected types as
      // runtime value imports; separating them breaks resolution.
      '@typescript-eslint/consistent-type-imports': 'off'
    }
  },

  // ---- scripts : CLIs may print ---------------------------------------------
  {
    files: ['scripts/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'console-rules/no-raw-console': 'off' }
  },

  // ---- flat-config files themselves ---------------------------------------
  {
    files: ['*.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off'
    }
  },

  prettier
)
