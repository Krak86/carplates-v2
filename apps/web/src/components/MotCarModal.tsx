import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { MotIssue, MotResponse } from '@carplates/shared'

import MotHelp from '@/components/MotHelp'
import {
  MOT_MAX_KM,
  bandLabel,
  bandOfKm,
  formatShare,
  formatTests,
  groupKey,
  motCarTab,
  type MotCarTab
} from '@/components/MotFaults.helpers'
import { reasonLabel } from '@/components/MotReasons'
import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'

type Match = NonNullable<MotResponse['match']>

type Props = {
  /** "Skoda Octavia" — the matched UK make / model. */
  name: string
  /** The car's own model year, or null. */
  year: number | null
  match: Match
  /** Odometer / band the modal opens on (a shared link's, or the last choice). */
  initial: MotCarTab
  onClose: () => void
}

const REASONS_SHOWN = 8

/** Share of the band for one issue, 0 when the band has too few tests (sorts last). */
const shareAt = (values: readonly (number | null)[], band: number): number => values[band] ?? 0

/**
 * "My car's mileage": the whole section for ONE mileage band — the odometer value (or a chosen band; typing an odometer
 * value picks its band) opens the headline numbers, every problem group and the most frequent specific faults at that
 * mileage. Shareable: the link carries the odometer value or the band. Portal for the same reason as Model360Modal (the
 * result Card's 3D tilt transform). Still model-level UK statistics — never a verdict on this car.
 */
export default function MotCarModal({ name, year, match, initial, onClose: onClosed }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [kmText, setKmText] = useState(initial.km != null ? String(initial.km) : '')
  const [band, setBand] = useState(initial.band ?? 0)
  // Closing plays the exit animation first; the parent unmounts us once it is over.
  const [closing, setClosing] = useState(false)
  const km = kmText === '' ? null : Math.min(Number(kmText), MOT_MAX_KM)
  const b = match.bands[band]
  const lang = i18n.language

  const handleClose = (): void => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) onClosed()
    else setClosing(true)
  }

  const handleKmChange = (value: string): void => {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setKmText(digits)
    if (digits !== '') setBand(bandOfKm(match.edgesKm, Number(digits)))
  }

  const handleBand = (i: number): void => {
    setBand(i)
    // A chosen band replaces an odometer value that no longer falls in it.
    if (km != null && bandOfKm(match.edgesKm, km) !== i) setKmText('')
  }

  // Safety net if the animationend event never fires (e.g. a background tab).
  useEffect(() => {
    if (!closing) return
    const timer = setTimeout(onClosed, 400)
    return () => clearTimeout(timer)
  }, [closing, onClosed])

  const groups = [...match.groups]
    .map(g => ({ g, fail: shareAt(g.fail, band), watch: shareAt(g.watch, band) }))
    .filter(x => x.fail > 0 || x.watch > 0)
    .sort((x, y) => y.fail - x.fail || y.watch - x.watch)
  const groupMax = Math.max(0.0001, ...groups.flatMap(x => [x.fail, x.watch]))
  const reasons = [...match.reasons]
    .map(r => ({ r, fail: shareAt(r.fail, band), watch: shareAt(r.watch, band) }))
    .filter(x => x.fail > 0)
    .sort((x, y) => y.fail - x.fail)
    .slice(0, REASONS_SHOWN)

  const bar = (value: number, color: string): ReactNode => (
    <span
      aria-hidden
      className="block h-1.5 rounded-full"
      style={{ width: `${(value / groupMax) * 100}%`, background: color }}
    />
  )

  const issueLine = (issue: MotIssue, label: string): ReactNode => {
    const baseFail = issue.baselineFail?.[band]
    return (
      <>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-[var(--color-muted)]">
          {t('mot.fail')} {formatShare(issue.fail[band])}
          {baseFail != null && ` (${t('mot.average')} ${formatShare(baseFail)})`} · {t('mot.watch')}{' '}
          {formatShare(issue.watch[band])}
        </span>
      </>
    )
  }

  return createPortal(
    <div
      data-closing={closing || undefined}
      className="fixed inset-0 z-30 flex animate-modal-backdrop items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
    >
      <div
        data-closing={closing || undefined}
        onAnimationEnd={e => {
          if (closing && e.target === e.currentTarget) onClosed()
        }}
        className="h-full w-full max-w-2xl animate-modal-panel overflow-y-auto rounded-xl bg-[var(--color-surface)] p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{t('mot.car.title', { name })}</div>
            <div className="text-sm text-[var(--color-muted)]">
              {t('mot.car.subtitle', { year: year ?? '' }).trim()}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ShareButton
              section="faults"
              tab={motCarTab({ km, band })}
              label={t('share.button', { section: t('mot.car.shareName') })}
            />
            <button
              type="button"
              onClick={handleClose}
              aria-label={t('mot.car.close')}
              className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
            >
              ✕
            </button>
          </div>
        </div>

        <label className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{t('mot.car.odometer')}</span>
          <input
            type="text"
            inputMode="numeric"
            value={kmText}
            onChange={e => handleKmChange(e.target.value)}
            placeholder={t('mot.car.placeholder')}
            className="w-32 rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1 tabular-nums"
          />
          <span className="text-[var(--color-muted)]">{t('mot.car.km')}</span>
        </label>
        <p className="mt-1 text-xs text-[var(--color-muted)]">{t('mot.car.orRange')}</p>

        <p className="mt-2 text-xs font-medium text-[var(--color-warning,var(--color-fg))]">
          ⚠️ {t('mot.car.rangeNote')}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label={t('mot.car.range')}>
          {match.bands.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={band === i}
              onClick={() => handleBand(i)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs tabular-nums',
                band === i
                  ? 'border-[var(--color-primary)] bg-primary/15 font-medium'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-primary/10'
              )}
            >
              {bandLabel(match.edgesKm, i)}
            </button>
          ))}
        </div>

        <div key={band} className="animate-fade-in">
          <div className="mt-3 space-y-1 rounded-lg bg-[var(--color-bg)]/40 p-3 text-sm">
            <p className="font-medium">
              {t('mot.car.band', { band: bandLabel(match.edgesKm, band), unit: t('mot.axis.kmShort') })}
              {km != null && (
                <span className="font-normal text-[var(--color-muted)]">
                  {' '}
                  · {t('mot.car.yours', { km: formatTests(km) })}
                </span>
              )}
            </p>
            {b?.failRate == null ? (
              <p className="text-[var(--color-muted)]">{t('mot.readout.notEnough')}</p>
            ) : (
              <>
                <p>
                  {t('mot.car.summary', {
                    name,
                    tests: formatTests(b.tests),
                    fail: formatShare(b.failRate),
                    watch: formatShare(b.watchRate)
                  })}
                </p>
                <p className="text-[var(--color-muted)]">
                  {b.baselineFailRate != null && `${t('mot.average')} ${formatShare(b.baselineFailRate)}`}
                  {b.dangerousRate != null && ` · ${t('mot.dangerous')} ${formatShare(b.dangerousRate)}`}
                  <span className="ml-1 inline-block align-middle">
                    <MotHelp term="share" />
                  </span>
                </p>
              </>
            )}
          </div>

          <h3 className="mt-3 text-base font-medium">{t('mot.car.groups')}</h3>
          {groups.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">{t('mot.row.noData')}</p>
          ) : (
            <ul className="mt-1 divide-y divide-[var(--color-border)]">
              {groups.map(({ g, fail, watch }, i) => (
                <li key={g.code} className="animate-row-in py-1.5" style={{ '--row-i': i } as React.CSSProperties}>
                  {issueLine(g, t(groupKey(g.code)))}
                  <span className="mt-1 block space-y-0.5">
                    {bar(fail, 'var(--color-mot-fail)')}
                    {bar(watch, 'var(--color-mot-watch)')}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {reasons.length > 0 && (
            <>
              <h3 className="mt-3 text-base font-medium">{t('mot.car.reasons')}</h3>
              <ul className="mt-1 divide-y divide-[var(--color-border)]">
                {reasons.map(({ r }, i) => {
                  const translated = reasonLabel(r.code, lang)
                  return (
                    <li key={r.code} className="animate-row-in py-1.5" style={{ '--row-i': i } as React.CSSProperties}>
                      {issueLine(r, translated ?? `${r.item}: ${r.failText || r.watchText}`)}
                      {translated && (
                        <span lang="en" className="block text-xs text-[var(--color-muted)]">
                          {`${r.item}: ${r.failText || r.watchText}`}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          <p className="mt-3 text-xs text-[var(--color-muted)]">{t('mot.car.note', { name })}</p>
        </div>
      </div>
    </div>,
    document.body
  )
}
