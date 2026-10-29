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
  // Manual open/close per month; unset months default to "newest visible is open".
  const [toggled, setToggled] = useState<Record<string, boolean>>({})

  const handleGroup = (next: ReleaseGroup | null): void => {
    setToggled({})
    setGroup(next)
  }

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

  const formatMonth = new Intl.DateTimeFormat(DATE_LOCALE[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' })

  // Days are already newest-first, so months come out newest-first too; only the first stays open.
  const months: { month: string; days: typeof days }[] = []
  for (const day of days) {
    const month = day.date.slice(0, 7)
    const last = months.at(-1)
    if (last?.month === month) last.days.push(day)
    else months.push({ month, days: [day] })
  }

  return (
    <div className="mx-auto w-full max-w-content">
      <Card className="mb-4">
        <h1 className="mb-2 text-2xl font-bold">{t('releases.title')}</h1>
        <p className="text-[var(--color-muted)]">{t('releases.intro')}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={!group}
            onClick={() => handleGroup(null)}
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
              onClick={() => handleGroup(group === g ? null : g)}
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

      {months.map((m, idx) => {
        const isOpen = toggled[m.month] ?? idx === 0

        return (
          // Keyed by filter so the sections ease in again when the tag filter changes.
          <section
            key={`${m.month}-${group}`}
            style={{ '--row-i': idx } as React.CSSProperties}
            className="mb-3 animate-row-in will-change-[transform,opacity]"
          >
            <h2>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`releases-${m.month}`}
                onClick={() => setToggled(s => ({ ...s, [m.month]: !isOpen }))}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-surface)] px-3 py-2 text-left text-lg font-semibold capitalize"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-300 motion-reduce:transition-none',
                    isOpen && 'rotate-90'
                  )}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
                <span>
                  {formatMonth.format(new Date(`${m.month}-01`))}{' '}
                  <span className="text-sm font-normal text-[var(--color-muted)]">
                    ({m.days.reduce((n, d) => n + d.items.length, 0)})
                  </span>
                </span>
              </button>
            </h2>

            <div
              id={`releases-${m.month}`}
              inert={!isOpen}
              className={cn(
                'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none',
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="pt-2">
                  {m.days.map(day => (
                    <Card key={day.date} className="mb-3 last:mb-0">
                      <h3 className="mb-2 text-lg font-semibold">
                        <time dateTime={day.date}>{formatDate.format(new Date(day.date))}</time>
                      </h3>

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
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
