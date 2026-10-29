import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'

const DASHBOARD_LINKS = [
  { labelKey: 'admin.links.resendEmails', href: 'https://resend.com/emails', icon: '📨' },
  { labelKey: 'admin.links.resendDomains', href: 'https://resend.com/domains', icon: '🌐' },
  { labelKey: 'admin.links.resendKeys', href: 'https://resend.com/api-keys', icon: '🔑' },
  { labelKey: 'admin.links.cloudflare', href: 'https://dash.cloudflare.com/', icon: '☁️' },
  { labelKey: 'admin.links.turnstile', href: 'https://dash.cloudflare.com/?to=/:account/turnstile', icon: '🛡️' },
  { labelKey: 'admin.links.r2', href: 'https://dash.cloudflare.com/?to=/:account/r2/overview', icon: '🗄️' },
  {
    labelKey: 'admin.links.squarespace',
    href: 'https://account.squarespace.com/domains/managed/carsua.app/dns/dns-settings',
    icon: '🔗'
  },
  { labelKey: 'admin.links.contabo', href: 'https://my.contabo.com/servers/vps', icon: '🖥️' },
  {
    labelKey: 'admin.links.healthchecks',
    href: 'https://healthchecks.io/projects/8beb7bde-da0f-46d1-b2d4-b16926a07f5a/checks/',
    icon: '💓'
  },
  { labelKey: 'admin.links.uptimerobot', href: 'https://dashboard.uptimerobot.com/monitors', icon: '📡' },
  { labelKey: 'admin.links.githubActions', href: 'https://github.com/Krak86/carplates-v2/actions', icon: '⚙️' },
  { labelKey: 'admin.links.githubPackages', href: 'https://github.com/Krak86?tab=packages', icon: '📦' },
  { labelKey: 'admin.links.posthog', href: 'https://eu.posthog.com/', icon: '📊' },
  { labelKey: 'admin.links.sentry', href: 'https://sentry.io/', icon: '🐞' },
  { labelKey: 'admin.links.searchConsole', href: 'https://search.google.com/search-console', icon: '🔍' },
  { labelKey: 'admin.links.googleCloud', href: 'https://console.cloud.google.com/apis/credentials', icon: '🔐' },
  { labelKey: 'admin.links.telegram', href: 'https://t.me/BotFather', icon: '✈️' },
  { labelKey: 'admin.links.disqus', href: 'https://disqus.com/admin/', icon: '💬' }
] as const

export default function AdminLinksTab(): ReactNode {
  const { t } = useTranslation()

  return (
    <section>
      <p className="mb-3 text-[var(--color-muted)]">{t('admin.links.intro')}</p>

      <Card className="divide-y divide-[var(--color-border)] p-0">
        {DASHBOARD_LINKS.map(link => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 hover:bg-primary/5"
          >
            <span aria-hidden>{link.icon}</span>
            <span className="min-w-0 flex-1">{t(link.labelKey)}</span>
            <span aria-hidden>↗</span>
          </a>
        ))}
      </Card>
    </section>
  )
}
