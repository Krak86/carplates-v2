import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { LossesResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { toIntlLocale } from '@/lib/intl'
import {
  INFOGRAPHIC_WIDTH,
  infographicFileName,
  infographicHeight,
  renderLossesInfographic
} from '@/lib/losses-infographic'
import { WAR_START_DATE, lossRows, signed } from '@/routes/alarms/losses-helpers'

type Props = { data: LossesResponse }

/**
 * The single-shot view: one image with a line per category, drawn on a canvas so the picture on screen is exactly the
 * downloadable PNG. Figures stay labelled as the General Staff's approximate numbers (subtitle + footer in the image).
 */
export default function LossesInfographic({ data }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null)
  const [failed, setFailed] = useState(false)

  const number = new Intl.NumberFormat(locale)
  const fmt = (iso: string): string =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    })
  const date = fmt(data.date)
  const input = {
    title: t('losses.title'),
    subtitle: t('losses.shot.subtitle', { from: fmt(WAR_START_DATE), to: date, day: data.day ?? '-' }),
    rows: lossRows(data.stats, data.increase ?? {}).map(r => ({
      category: r.category,
      name: t(`losses.cat.${r.category}`),
      total: r.total === null ? '-' : number.format(r.total),
      change: signed(r.increase)
    })),
    footer: t('losses.disclaimer'),
    credit: t('losses.shot.credit')
  }
  const height = infographicHeight(input.rows.length)
  // Re-draw only when the visible text changes (data, language), not on every render.
  const key = JSON.stringify(input)

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    void renderLossesInfographic(JSON.parse(key) as typeof input).then(blob => {
      if (cancelled) return
      if (!blob) {
        setFailed(true)
        return
      }
      url = URL.createObjectURL(blob)
      setFailed(false)
      setShot({ blob, url })
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [key])

  if (failed) return <p className="text-sm text-[var(--color-muted)]">{t('losses.shot.failed')}</p>
  if (!shot)
    return (
      <div
        style={{ aspectRatio: `${INFOGRAPHIC_WIDTH} / ${height}` }}
        className="w-full max-w-[640px] animate-pulse rounded-xl bg-[var(--color-border)]"
      />
    )

  return (
    <div className="flex flex-col items-start gap-3">
      <img
        src={shot.url}
        alt={t('losses.shot.alt', { date })}
        width={INFOGRAPHIC_WIDTH}
        height={height}
        className="h-auto w-full max-w-[640px] rounded-xl border border-[var(--color-border)]"
      />
      <a
        href={shot.url}
        download={infographicFileName(data.date)}
        className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]"
      >
        {t('losses.shot.download')}
      </a>
    </div>
  )
}
