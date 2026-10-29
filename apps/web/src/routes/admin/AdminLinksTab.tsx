import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { adminLinksQuery } from '@/lib/queries'

export default function AdminLinksTab(): ReactNode {
  const { t } = useTranslation()
  const links = useQuery(adminLinksQuery())

  if (links.isPending) return <Spinner />
  if (links.isError) return <p className="text-red-600">{t('result.error')}</p>

  return (
    <section>
      <p className="mb-3 text-[var(--color-muted)]">{t('admin.links.intro')}</p>

      <Card className="divide-y divide-[var(--color-border)] p-0">
        {links.data.links.map(link => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 hover:bg-primary/5"
          >
            <span aria-hidden>{link.icon}</span>
            <span className="min-w-0 flex-1">{link.label}</span>
            <span aria-hidden>↗</span>
          </a>
        ))}
      </Card>
    </section>
  )
}
