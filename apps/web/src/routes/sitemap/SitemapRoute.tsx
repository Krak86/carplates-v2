import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { SITEMAP_GROUPS, SITEMAP_TIPS } from '@/routes/sitemap/helpers'

const LINK_CLASS =
  'flex items-center gap-2 rounded-lg px-2 py-1.5 text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10'

// Lazy-loaded (see App.tsx).
export default function SitemapRoute(): ReactNode {
  const { t } = useTranslation()

  return (
    <article className="mx-auto w-full max-w-6xl space-y-4">
      <Card>
        <h1 className="mb-2 text-2xl font-bold">
          <span aria-hidden>🗺️</span> {t('sitemap.title')}
        </h1>
        <p className="text-[var(--color-muted)]">{t('sitemap.intro')}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SITEMAP_GROUPS.map(group => (
          <Card key={group.id} id={group.id} className="space-y-2">
            <h2 className="text-lg font-semibold">
              <span aria-hidden>{group.icon}</span> {t(`sitemap.group.${group.id}`)}
            </h2>
            <p className="text-sm text-[var(--color-muted)]">{t(`sitemap.group.${group.id}.desc`)}</p>

            <ul className="text-sm">
              {group.links.map(item => (
                <li key={item.to}>
                  <Link viewTransition to={item.to} className={LINK_CLASS}>
                    <span aria-hidden>{item.icon}</span>
                    <span className="underline-offset-2 hover:underline">{t(item.labelKey)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            <span aria-hidden>🧩</span> {t('sitemap.tips.title')}
          </h2>
          <p className="text-sm text-[var(--color-muted)]">{t('sitemap.tips.intro')}</p>
        </div>

        <ul className="grid gap-3 md:grid-cols-2">
          {SITEMAP_TIPS.map(tip => (
            <li key={tip.id} className="space-y-2 rounded-lg bg-[var(--color-bg)]/40 p-3 text-sm">
              <h3 className="font-medium">
                <span aria-hidden>{tip.icon}</span> {t(`sitemap.tip.${tip.id}.title`)}
              </h3>
              <p className="text-[var(--color-muted)]">{t(`sitemap.tip.${tip.id}.text`)}</p>

              {tip.itemKeys.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {tip.itemKeys.map(key => (
                    <li key={key} className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-xs">
                      {t(key)}
                    </li>
                  ))}
                </ul>
              )}

              {tip.link && (
                <Link
                  viewTransition
                  to={tip.link.to}
                  className="inline-block text-[var(--color-primary)] hover:underline"
                >
                  {tip.link.icon} {t(tip.link.labelKey)}
                </Link>
              )}
            </li>
          ))}
        </ul>

        <p className="text-sm text-[var(--color-muted)]">
          <span aria-hidden>🔎</span> {t('sitemap.lookup')}
        </p>
        <p className="text-xs text-[var(--color-muted)]">{t('sitemap.hidden')}</p>
      </Card>
    </article>
  )
}
