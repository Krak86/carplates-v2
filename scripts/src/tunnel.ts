/**
 * `pnpm tunnel` — one command to test the production build through a Cloudflare tunnel:
 *   db up + migrate → pnpm build → cloudflared → API serving the built SPA with PUBLIC_SITE_URL = tunnel URL → smoke
 *   checks → prints what you still have to do by hand (Google Console origin, Telegram /setdomain).
 *
 *   pnpm tunnel                      quick tunnel (random https://*.trycloudflare.com, changes every run)
 *   pnpm tunnel --skip-build         reuse the existing dist/
 *   pnpm tunnel --no-db              skip `db:up` + `db:migrate`
 *   pnpm tunnel --port 3000          API port (default PORT from apps/api/.env, else 3000)
 *   pnpm tunnel --hostname dev.example.com
 *                                    named tunnel with a stable hostname; needs CLOUDFLARE_TUNNEL_TOKEN in the environment
 *                                    (Zero Trust → Networks → Tunnels → create → public hostname → service http://localhost:PORT)
 */
import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const API_DIR = resolve(ROOT, 'apps/api')
const QUICK_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/

const argv = process.argv.slice(2)
const flag = (name: string): boolean => argv.includes(`--${name}`)
const option = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? argv[i + 1] : undefined
}

const children: ChildProcess[] = []

function step(msg: string): void {
  console.log(`\n▶ ${msg}`)
}

function fail(msg: string): never {
  console.error(`\n✖ ${msg}`)
  shutdown(1)
  throw new Error(msg)
}

/** Kills a child and its process tree (`pnpm`/shell wrappers leave grandchildren on Windows). */
function kill(child: ChildProcess): void {
  if (!child.pid || child.exitCode !== null) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGTERM')
}

function shutdown(code = 0): void {
  for (const c of children) kill(c)
  process.exit(code)
}

function run(cmd: string, args: string[]): void {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) fail(`\`${cmd} ${args.join(' ')}\` failed (exit ${r.status})`)
}

/** Reads `KEY=value` lines from apps/api/.env (no secrets are printed, only used to tailor the checklist). */
function readDotEnv(): Record<string, string> {
  const file = resolve(API_DIR, '.env')
  if (!existsSync(file)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (m?.[1]) out[m[1]] = (m[2] ?? '').replace(/^["']|["']$/g, '')
  }
  return out
}

function portFree(port: number): Promise<boolean> {
  return new Promise(res => {
    const srv = createServer()
    srv.once('error', () => res(false))
    srv.once('listening', () => srv.close(() => res(true)))
    srv.listen(port, '127.0.0.1')
  })
}

async function waitFor(label: string, probe: () => Promise<boolean>, seconds: number): Promise<void> {
  const deadline = Date.now() + seconds * 1000
  while (Date.now() < deadline) {
    if (await probe().catch(() => false)) return
    await new Promise(r => setTimeout(r, 1000))
  }
  fail(`Timed out after ${seconds}s waiting for ${label}`)
}

function startTunnel(port: number, hostname: string | undefined): Promise<string> {
  const token = process.env.CLOUDFLARE_TUNNEL_TOKEN
  if (hostname && !token) fail('--hostname needs CLOUDFLARE_TUNNEL_TOKEN in the environment')
  const args = hostname
    ? ['tunnel', '--no-autoupdate', 'run', '--token', token as string]
    : ['tunnel', '--no-autoupdate', '--url', `http://localhost:${port}`]
  const child = spawn('cloudflared', args, { stdio: ['ignore', 'pipe', 'pipe'] })
  children.push(child)
  child.on('error', err => fail(`Could not start cloudflared: ${err.message}`))
  child.on('exit', code => {
    if (code) fail(`cloudflared exited with code ${code}`)
  })
  return new Promise(res => {
    if (hostname) res(`https://${hostname}`)
    const onData = (buf: Buffer): void => {
      const url = QUICK_URL_RE.exec(buf.toString())?.[0]
      if (url) res(url)
    }
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData) // cloudflared logs to stderr
  })
}

async function main(): Promise<void> {
  process.on('SIGINT', () => shutdown(0))
  process.on('SIGTERM', () => shutdown(0))

  const dotenv = readDotEnv()
  const port = Number(option('port') ?? dotenv.PORT ?? 3000)
  const hostname = option('hostname')

  step('Checking prerequisites')
  const cf = spawnSync('cloudflared', ['--version'], { encoding: 'utf8' })
  if (cf.error || cf.status !== 0)
    fail(
      'cloudflared is not installed or not on PATH.\n' +
        '  Windows: winget install --id Cloudflare.cloudflared   (then open a NEW terminal)\n' +
        '  macOS:   brew install cloudflared\n' +
        '  Linux:   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/'
    )
  console.log(`  ${cf.stdout.trim() || cf.stderr.trim()}`)
  if (!(await portFree(port)))
    fail(`Port ${port} is busy — stop \`pnpm dev\` (or any other API) first, or pass --port <free port>`)

  if (!flag('no-db')) {
    step('Database: up + migrate')
    run('pnpm', ['db:up'])
    run('pnpm', ['db:migrate'])
  }

  if (!flag('skip-build')) {
    step('Building shared, db, api, web')
    run('pnpm', ['build'])
  } else if (!existsSync(resolve(API_DIR, 'dist/main.js')) || !existsSync(resolve(ROOT, 'apps/web/dist')))
    fail('--skip-build given but dist/ is missing — run without it once')

  step(hostname ? `Starting named tunnel ${hostname}` : 'Starting quick tunnel')
  const siteUrl = await startTunnel(port, hostname)
  console.log(`  ${siteUrl}`)

  step('Starting API (serves the built SPA)')
  // `--env-file` never overrides variables already in the environment, so these win over .env / preview.env.
  const api = spawn(process.execPath, ['--env-file-if-exists=.env', '--env-file=preview.env', 'dist/main.js'], {
    cwd: API_DIR,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port), PUBLIC_SITE_URL: siteUrl, TRUST_PROXY: 'true' }
  })
  children.push(api)
  api.on('exit', code => fail(`API exited with code ${code}`))
  await waitFor('the API', async () => (await fetch(`http://localhost:${port}/api/auth/config`)).ok, 60)

  step('Smoke checks through the tunnel')
  let config: { googleClientId: string | null; telegramBotUsername: string | null } | undefined
  await waitFor(
    'the tunnel to route traffic (DNS can take ~10–30 s)',
    async () => {
      const r = await fetch(`${siteUrl}/api/auth/config`)
      if (!r.ok) return false
      config = (await r.json()) as typeof config
      return true
    },
    90
  )
  const checks: Array<[string, boolean]> = [
    ['GET /api/auth/config', true],
    [
      'GET / returns the SPA',
      await fetch(siteUrl).then(r => r.ok && (r.headers.get('content-type') ?? '').includes('html'))
    ],
    [
      '/robots.txt points at the tunnel URL',
      await fetch(`${siteUrl}/robots.txt`).then(async r => (await r.text()).includes(siteUrl))
    ],
    [
      '/sitemap.xml uses the tunnel URL',
      await fetch(`${siteUrl}/sitemap.xml`).then(async r => (await r.text()).includes(siteUrl))
    ]
  ]
  for (const [name, ok] of checks) console.log(`  ${ok ? '✔' : '✖'} ${name}`)

  printChecklist(siteUrl, Boolean(hostname), config)
  console.log('\nRunning — press Ctrl+C to stop the API and the tunnel.')
}

function printChecklist(
  siteUrl: string,
  stable: boolean,
  config: { googleClientId: string | null; telegramBotUsername: string | null } | undefined
): void {
  const host = new URL(siteUrl).host
  const lines: string[] = [
    `\n${'─'.repeat(70)}`,
    `Open: ${siteUrl}`,
    `\nManual steps still needed (once per tunnel URL${stable ? ' — yours is stable' : ''}):`
  ]
  let n = 1

  if (config?.googleClientId) {
    lines.push(
      `\n${n++}. Google sign-in — https://console.cloud.google.com/apis/credentials`,
      `   → your OAuth 2.0 Web client (${config.googleClientId.slice(0, 12)}…) → "Authorized JavaScript origins" → ADD URI:`,
      `       ${siteUrl}`,
      `   → Save. Changes can take a few minutes (up to an hour) to apply.`,
      `   (no redirect URI needed: the app uses the Google Identity Services button)`
    )
  } else lines.push(`\n–  Google sign-in is off: GOOGLE_CLIENT_ID is not set in apps/api/.env.`)

  if (config?.telegramBotUsername) {
    lines.push(
      `\n${n++}. Telegram sign-in — in Telegram open @BotFather:`,
      `       /setdomain → pick @${config.telegramBotUsername} → send:  ${host}`,
      `   A bot has ONE domain at a time: re-run /setdomain with your real domain afterwards (or use a separate test bot).`
    )
  } else lines.push(`–  Telegram sign-in is off: TELEGRAM_BOT_TOKEN / TELEGRAM_BOT_USERNAME are not set.`)

  lines.push(
    `\n${n++}. Cloudflare Turnstile (only if TURNSTILE_* is set) — https://dash.cloudflare.com/?to=/:account/turnstile`,
    `   → your widget → Hostnames → add: ${host}`,
    `\n${n++}. Email sign-in links use the tunnel URL automatically; with MAIL_TRANSPORT=log copy the link from the API log above.`,
    `\n${n}. Verify by hand: sign in with Google + Telegram, install the PWA (/install), share a plate link and check its preview,`,
    `   open the site on a phone over mobile data.`
  )
  if (!stable)
    lines.push(
      `\nTip: a quick-tunnel URL changes on every run, so the Google/Telegram/Turnstile steps repeat each time. For a stable URL create a named tunnel`,
      `(Cloudflare Zero Trust → Networks → Tunnels) and run:  CLOUDFLARE_TUNNEL_TOKEN=… pnpm tunnel --hostname dev.example.com`
    )
  lines.push('─'.repeat(70))
  console.log(lines.join('\n'))
}

main().catch(err => {
  console.error(err)
  shutdown(1)
})
