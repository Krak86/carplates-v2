import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'

const DASHBOARD_LINKS = [
  { labelKey: 'admin.links.resendEmails', href: 'https://resend.com/emails', icon: '📨' },
  { labelKey: 'admin.links.resendDomains', href: 'https://resend.com/domains', icon: '🌐' },
  { labelKey: 'admin.links.resendKeys', href: 'https://resend.com/api-keys', icon: '🔑' },
  { labelKey: 'admin.links.cloudflare', href: 'https://dash.cloudflare.com/', icon: '☁️' },
  { labelKey: 'admin.links.turnstile', href: 'https://dash.cloudflare.com/?to=/:account/turnstile', icon: '🛡️' }
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
