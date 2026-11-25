// Local equivalent of .github/workflows/security.yml (wiki step 23): `pnpm security:check`.
// Needs Docker. Scanner versions mirror the workflow env block; bump them together.
// Opengrep and CodeQL run in CI only (no official image / needs the CodeQL CLI).
import { spawnSync } from 'node:child_process'

const GITLEAKS = 'ghcr.io/gitleaks/gitleaks:v8.30.1'
const TRIVY = 'aquasec/trivy:0.76.2'
const OSV = 'ghcr.io/google/osv-scanner:v2.7.1'

const repo = process.cwd()
const mount = ['-v', `${repo}:/repo:ro`, '-w', '/repo']
const docker = (image, args) => ['docker', ['run', '--rm', ...mount, image, ...args]]

const checks = [
  ['gitleaks (full history)', ...docker(GITLEAKS, ['git', '--redact', '--no-banner', '--exit-code', '1', '.'])],
  [
    'trivy fs',
    ...docker(TRIVY, [
      'fs',
      '--scanners',
      'vuln,secret',
      '--severity',
      'HIGH,CRITICAL',
      '--ignore-unfixed',
      '--exit-code',
      '1',
      '--skip-dirs',
      '**/node_modules',
      '--skip-dirs',
      '.claude',
      '.'
    ])
  ],
  ['trivy config', ...docker(TRIVY, ['config', '--severity', 'HIGH,CRITICAL', '--exit-code', '1', '.'])],
  ['pnpm audit', 'pnpm', ['audit', '--audit-level=high']]
]

const failed = []

// osv-scanner has no severity flag: capture its JSON and apply the shared baseline (CVSS >= 7.0) in osv-gate.mjs.
console.log('\n=== osv-scanner ===')
const [, osvArgs] = docker(OSV, [
  'scan',
  'source',
  '-L',
  'pnpm-lock.yaml',
  '-L',
  'services/alpr/requirements.txt',
  '--format',
  'json'
])
const osv = spawnSync('docker', osvArgs, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
if (osv.status === 0 || osv.status === 1) {
  const gate = spawnSync('node', ['infra/ci/osv-gate.mjs'], {
    input: osv.stdout,
    stdio: ['pipe', 'inherit', 'inherit']
  })
  if (gate.status !== 0) failed.push('osv-scanner')
} else {
  console.log(osv.stderr)
  failed.push('osv-scanner')
}
for (const [name, cmd, args] of checks) {
  console.log(`\n=== ${name} ===`)
  // nosemgrep: javascript.lang.security.audit.spawn-shell-true - fixed args from the local checks table; shell only on Windows for .cmd shims
  const { status } = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (status !== 0) failed.push(name)
}

console.log(failed.length ? `\nFAILED: ${failed.join(', ')}` : '\nAll security checks passed.')
process.exit(failed.length ? 1 : 0)
