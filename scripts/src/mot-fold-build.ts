/**
 * Rebuilds `mot-real-models.json` (the "real model" list `mot-fold.ts` folds trims into) from the cached 2021 + 2022
 * censuses: a make/model with >= MIN tests in BOTH years. Those two years still carry the old base-name style.
 *
 *   pnpm --filter @carplates/scripts exec tsx src/mot-fold-build.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { Census } from './mot-aggregate.js'
import { REAL_MODEL_MIN_TESTS } from './mot-fold.js'

const dir = resolve(import.meta.dirname, '../.data/mot')
const load = (y: number): Census => JSON.parse(readFileSync(join(dir, `census-${y}.json`), 'utf8')) as Census
const [a, b] = [load(2021), load(2022)]
const real = Object.keys(a)
  .filter(id => (a[id]?.tests ?? 0) >= REAL_MODEL_MIN_TESTS && (b[id]?.tests ?? 0) >= REAL_MODEL_MIN_TESTS)
  .sort()
writeFileSync(resolve(import.meta.dirname, 'mot-real-models.json'), JSON.stringify(real) + '\n')
console.log(`${real.length} real models`)
