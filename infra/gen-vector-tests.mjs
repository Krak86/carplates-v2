// Generates the `tests:` block of infra/vector.yaml from the shared redaction fixture, so the VRL in Vector and
// packages/shared/src/log-redact.ts cannot drift (docs/logs-plan.md). No dependencies: `node infra/gen-vector-tests.mjs`
// rewrites the block between the BEGIN / END markers; `--check` only compares and exits 1 when the block is stale (CI).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = path => fileURLToPath(new URL(path, import.meta.url))
const FIXTURE = here('../packages/shared/src/__fixtures__/log-lines.txt')
const CONFIG = here('./vector.yaml')
const BEGIN = '# BEGIN GENERATED TESTS'
const END = '# END GENERATED TESTS'

const cases = readFileSync(FIXTURE, 'utf8')
  .split(/\r?\n/)
  .filter(line => line !== '' && !line.startsWith('#'))
  .map((line, index) => {
    const tab = line.indexOf('\t')
    if (tab < 0) throw new Error(`fixture line ${index + 1} has no TAB: ${line}`)
    return { raw: line.slice(0, tab), expected: line.slice(tab + 1) }
  })

// JSON strings are valid YAML double-quoted scalars and valid VRL string literals (the fixture holds no control characters).
const q = JSON.stringify
const block = [
  '# raw -> expected pairs, one per fixture line',
  'tests:',
  ...cases.flatMap(({ raw, expected }, index) => {
    const id = String(index + 1).padStart(3, '0')
    return [
      `  - name: fixture-${id}`,
      '    inputs:',
      '      - insert_at: redact',
      '        type: log',
      `        log_fields: { message: ${q(raw)} }`,
      '    outputs:',
      '      - extract_from: redact',
      '        conditions:',
      '          - type: vrl',
      `            source: ${q(`assert_eq!(.message, ${q(expected)})`)}`
    ]
  })
].join('\n')

const current = readFileSync(CONFIG, 'utf8')
const start = current.indexOf(BEGIN)
const stop = current.indexOf(END)
if (start < 0 || stop < start) throw new Error('vector.yaml has no BEGIN/END GENERATED TESTS markers')
const beginLine = current.slice(start, current.indexOf('\n', start))
const next = `${current.slice(0, start)}${beginLine}\n${block}\n${current.slice(stop)}`

if (process.argv.includes('--check')) {
  if (next !== current) {
    console.error('infra/vector.yaml tests are stale: run `node infra/gen-vector-tests.mjs`')
    process.exit(1)
  }
  console.log(`vector.yaml tests are up to date (${cases.length} cases)`)
} else {
  writeFileSync(CONFIG, next)
  console.log(`wrote ${cases.length} cases to infra/vector.yaml`)
}
