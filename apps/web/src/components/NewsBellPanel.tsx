import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { Lang } from '@/i18n'
import { RELEASES } from '@/routes/releases/releases'
import { RELEASE_GROUP_ICON } from '@/routes/releases/types'

const DATE_LOCALE: Record<Lang, string> = { ua: 'uk-UA', ru: 'ru-RU', en: 'en-GB' }
const MAX_ITEMS = 5

const NEWEST_FIRST = [...RELEASES].sort((a, b) => b.date.localeCompare(a.date))

// The newest few items across days, newest day first.
const LATEST_ITEMS = NEWEST_FIRST.flatMap(day => day.items.map(item => ({ date: day.date, item }))).slice(0, MAX_ITEMS)

type Props = {
  /** Date the visitor has already seen; items from later days get a dot. */
  seen: string | null
  onNavigate: () => void
}

// Lazy-loaded (see NewsBell.tsx): it drags the whole release log along.
export default function NewsBellPanel({ seen, onNavigate }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language in DATE_LOCALE ? i18n.language : 'ua') as Lang
  const formatDate = new Intl.DateTimeFormat(DATE_LOCALE[lang], { day: 'numeric', month: 'short', timeZone: 'UTC' })

  return (
    <div className="w-80 max-w-[90vw] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 shadow-lg">
      <h2 className="mb-2 text-sm font-semibold">{t('nav.releases')}</h2>

      <ul className="space-y-2 text-sm">
        {LATEST_ITEMS.map(({ date, item }) => (
          <li key={item.en} className="flex gap-2">
            <span aria-hidden title={t(`releases.group.${item.group}`)}>
              {RELEASE_GROUP_ICON[item.group]}
            </span>

            <span className="min-w-0 flex-1">
              <time dateTime={date} className="block text-xs text-[var(--color-muted)]">
                {formatDate.format(new Date(date))}
                {!!seen && date > seen && <span className="ml-1 font-semibold text-[var(--color-primary)]">•</span>}
              </time>

              <span className="line-clamp-3">{item[lang]}</span>
            </span>
          </li>
        ))}
      </ul>

      <Link
        viewTransition
        to="/releases"
        onClick={onNavigate}
        className="mt-3 block text-center text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        {t('releases.bell.all')}
      </Link>
    </div>
  )
}
