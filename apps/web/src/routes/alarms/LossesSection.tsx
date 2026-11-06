import { lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_LOSS_CATEGORY } from '@carplates/shared'
import type { LossCategory } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import ShareButton from '@/components/ShareButton'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { lossesHistoryQuery, lossesQuery } from '@/lib/queries'
import { CHART_HEIGHT, CHART_WIDTH, lossRows, signed, totalsPath } from '@/routes/alarms/losses-helpers'
import ExternalLink from '@/components/ExternalLink'

const LossesInfographic = lazy(() => import('@/routes/alarms/LossesInfographic'))

/**
 * The General Staff's approximate figures for Russian losses, from our own daily copy (`/api/losses`, relayed by
 * russianwarship.rip). Informational only: always labelled "approximate" with the date and a source link when there is one.
 * Reads our database, so it shows even when the live alert feed is down; no data (404) hides the section.
 */
export default function LossesSection(): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const [category, setCategory] = useState<LossCategory>(DEFAULT_LOSS_CATEGORY)
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'losses'
  // A shared link opens the figures in a modal, so the visitor does not have to scroll down to them.
  const [dismissed, setDismissed] = useState(false)
  const isModal = isShared && !dismissed
  const losses = useQuery(lossesQuery())
  const history = useQuery(lossesHistoryQuery(category))
  const data = losses.data

  useEffect(() => {
    if (!isModal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isModal])

  if (losses.isError || !data) return null

  const number = new Intl.NumberFormat(locale)
  const date = (iso: string): string =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    })
  const rows = lossRows(data.stats, data.increase ?? {})
  const points = history.data?.points ?? []
  const path = totalsPath(points)
  const first = points[0]

  const card = (
    <Card className={isModal ? undefined : 'mb-6'}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t('losses.title')}</h2>
        <span className="flex items-center gap-2">
          <ShareButton section="losses" label={t('losses.share')} />
          {isModal && (
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label={t('losses.close')}
              className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              ✕
            </button>
          )}
        </span>
      </div>
      <p className="mb-1 text-sm text-[var(--color-muted)]">{t('losses.intro')}</p>
      <p className="mb-3 text-xs text-[var(--color-muted)]">
        {t('losses.asOf', { date: date(data.date), day: data.day ?? '-' })}
        {data.sourceUrl && (
          <>
            {' '}
            <ExternalLink href={data.sourceUrl} className="underline">
              {t('losses.sourcePost')}
            </ExternalLink>
          </>
        )}
      </p>

      <Suspense fallback={null}>
        <LossesInfographic data={data} />
      </Suspense>

      <h3 className="mt-6 mb-2 text-sm font-medium">{t('losses.view.details')}</h3>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(row => (
          <li key={row.category}>
            <button
              type="button"
              aria-pressed={row.category === category}
              onClick={() => setCategory(row.category)}
              className="flex w-full items-baseline justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-left aria-pressed:bg-[var(--color-border)]"
            >
              <span className="text-sm">{t(`losses.cat.${row.category}`)}</span>
              <span className="text-right">
                <span className="font-semibold tabular-nums">
                  {row.total === null ? '-' : number.format(row.total)}
                </span>
                {signed(row.increase) !== null && (
                  <span className="ml-1.5 text-xs text-[var(--color-muted)] tabular-nums">{signed(row.increase)}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {(history.isPending || (path && first)) && (
        <figure className="mt-4">
          <figcaption className="mb-1 text-sm font-medium">
            {t('losses.history', { name: t(`losses.cat.${category}`) })}
          </figcaption>
          {!path || !first ? (
            // Same footprint as the chart + date row, so switching topics does not shift the layout.
            <>
              <div
                aria-hidden
                className="h-32 w-full animate-pulse border-b border-l border-[var(--color-border)] bg-[var(--color-border)]/30"
              />
              <div aria-hidden className="mt-1 h-[15px]" />
            </>
          ) : (
            <>
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={t('losses.history', { name: t(`losses.cat.${category}`) })}
                className="h-32 w-full border-b border-l border-[var(--color-border)]"
              >
                <path
                  d={path}
                  fill="none"
                  stroke="var(--chip-safety)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="mt-1 flex justify-between text-[10px] text-[var(--color-muted)]">
                <span>{date(first.date)}</span>
                <span>{date(data.date)}</span>
              </div>
            </>
          )}
        </figure>
      )}

      <p className="mt-3 text-xs text-[var(--color-muted)]">{t('losses.disclaimer')}</p>
    </Card>
  )

  // Portal: the page's Cards use a 3D tilt `transform`, which would make a fixed overlay center on the Card, not the viewport.
  if (!isModal) return card
  return createPortal(
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      onClick={e => {
        if (e.target === e.currentTarget) setDismissed(true)
      }}
    >
      <div className="max-h-full w-full max-w-4xl overflow-y-auto rounded-xl">{card}</div>
    </div>,
    document.body
  )
}
