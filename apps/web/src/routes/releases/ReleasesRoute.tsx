import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RELEASES } from '@carplates/shared/releases'

import Card from '@/components/ui/Card'
import type { Lang } from '@/i18n'
import { cn } from '@/lib/cn'
import { RELEASE_GROUPS, RELEASE_GROUP_ICON } from '@/routes/releases/types'
import type { ReleaseGroup } from '@/routes/releases/types'

const DATE_LOCALE: Record<Lang, string> = { ua: 'uk-UA', ru: 'ru-RU', en: 'en-GB' }

const SORTED_RELEASES = [...RELEASES].sort((a, b) => b.date.localeCompare(a.date))

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function ReleasesRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language in DATE_LOCALE ? i18n.language : 'ua') as Lang
  const [group, setGroup] = useState<ReleaseGroup | null>(null)

  const formatDate = new Intl.DateTimeFormat(DATE_LOCALE[lang], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })

  const days = SORTED_RELEASES.map(day => ({
    ...day,
    items: day.items.filter(i => !group || i.group === group)
  })).filter(day => day.items.length > 0)

  return (
    <div className="mx-auto w-full max-w-content">
      <Card className="mb-4">
        <h1 className="mb-2 text-2xl font-bold">{t('releases.title')}</h1>
        <p className="text-[var(--color-muted)]">{t('releases.intro')}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={!group}
            onClick={() => setGroup(null)}
            className={cn(
              'rounded-full border border-[var(--color-border)] px-3 py-1 text-sm',
              !group && 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
            )}
          >
            {t('releases.group.all')}
          </button>

          {RELEASE_GROUPS.map(g => (
            <button
              key={g}
              type="button"
              aria-pressed={group === g}
              onClick={() => setGroup(group === g ? null : g)}
              className={cn(
                'rounded-full border border-[var(--color-border)] px-3 py-1 text-sm',
                group === g && 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
              )}
            >
              <span aria-hidden>{RELEASE_GROUP_ICON[g]}</span> {t(`releases.group.${g}`)}
            </button>
          ))}
        </div>
      </Card>

      {days.map(day => (
        <Card key={day.date} className="mb-3">
          <h2 className="mb-2 text-lg font-semibold">
            <time dateTime={day.date}>{formatDate.format(new Date(day.date))}</time>
          </h2>

          <ul className="space-y-1.5">
            {day.items.map(i => (
              <li key={i.en} className="flex gap-2">
                <span aria-hidden title={t(`releases.group.${i.group}`)}>
                  {RELEASE_GROUP_ICON[i.group]}
                </span>
                <span>{i[lang]}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}
