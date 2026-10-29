/** External dashboards for the admin Dashboards tab. Served by `GET /api/admin/links` (admin-only), never shipped in the web bundle. */
export const ADMIN_LINKS = [
  { label: 'Resend - sent emails and delivery logs', href: 'https://resend.com/emails', icon: '📨' },
  { label: 'Resend - sending domains and DNS records', href: 'https://resend.com/domains', icon: '🌐' },
  { label: 'Resend - API keys', href: 'https://resend.com/api-keys', icon: '🔑' },
  { label: 'Cloudflare - dashboard', href: 'https://dash.cloudflare.com/', icon: '☁️' },
  { label: 'Cloudflare - Turnstile widgets', href: 'https://dash.cloudflare.com/?to=/:account/turnstile', icon: '🛡️' },
  {
    label: 'Cloudflare - R2 backups bucket',
    href: 'https://dash.cloudflare.com/?to=/:account/r2/overview',
    icon: '🗄️'
  },
  {
    label: 'Squarespace - domain and DNS settings',
    href: 'https://account.squarespace.com/domains/managed/carsua.app/dns/dns-settings',
    icon: '🔗'
  },
  { label: 'Contabo - VPS servers', href: 'https://my.contabo.com/servers/vps', icon: '🖥️' },
  {
    label: 'Healthchecks.io - cron job checks',
    href: 'https://healthchecks.io/projects/8beb7bde-da0f-46d1-b2d4-b16926a07f5a/checks/',
    icon: '💓'
  },
  { label: 'UptimeRobot - uptime monitors', href: 'https://dashboard.uptimerobot.com/monitors', icon: '📡' },
  { label: 'GitHub - Actions and deploys', href: 'https://github.com/Krak86/carplates-v2/actions', icon: '⚙️' },
  { label: 'GitHub - container images (GHCR)', href: 'https://github.com/Krak86?tab=packages', icon: '📦' },
  { label: 'PostHog - analytics', href: 'https://eu.posthog.com/', icon: '📊' },
  { label: 'Sentry - errors', href: 'https://sentry.io/', icon: '🐞' },
  { label: 'Google Search Console - indexing', href: 'https://search.google.com/search-console', icon: '🔍' },
  {
    label: 'Google Cloud - OAuth client and Maps key',
    href: 'https://console.cloud.google.com/apis/credentials',
    icon: '🔐'
  },
  { label: 'Telegram - BotFather (login bot)', href: 'https://t.me/BotFather', icon: '✈️' },
  { label: 'Disqus - comments moderation', href: 'https://disqus.com/admin/', icon: '💬' }
] as const
