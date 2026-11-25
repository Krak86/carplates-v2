// Severity gate for `osv-scanner --format json` (file path argument, or stdin): the repo-wide baseline (wiki step 23) is
// "CVSS >= 7.0 (High/Critical) or unknown severity blocks; Medium/Low is listed as a warning". osv-scanner has no severity flag.
import { readFileSync } from 'node:fs'

const THRESHOLD = 7.0
const raw = readFileSync(process.argv[2] ?? 0, 'utf8')
const report = JSON.parse(raw)

const blocking = []
const warnings = []
for (const result of report.results ?? []) {
  for (const pkg of result.packages ?? []) {
    for (const group of pkg.groups ?? []) {
      const score = Number.parseFloat(group.max_severity)
      const line = `${pkg.package.name}@${pkg.package.version} ${(group.ids ?? []).join(', ')} (CVSS ${group.max_severity || 'unknown'})`
      ;(Number.isNaN(score) || score >= THRESHOLD ? blocking : warnings).push(line)
    }
  }
}

for (const line of warnings) console.log(`warning (below ${THRESHOLD}, not blocking): ${line}`)
for (const line of blocking) console.log(`ERROR (>= ${THRESHOLD} or unknown): ${line}`)
console.log(`osv gate: ${blocking.length} blocking, ${warnings.length} warning`)
process.exit(blocking.length ? 1 : 0)
