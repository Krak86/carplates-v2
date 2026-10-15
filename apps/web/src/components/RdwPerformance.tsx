import type { ReactNode } from 'react'
import type { RdwSpecs } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import {
  estimateZeroTo100,
  hpPerTonne,
  kerbMassOf,
  KYIV_LVIV_KM,
  powerEquivalents,
  rankSpeed,
  SPEED_ANCHORS,
  tripTime,
  UA_SPEED_LIMITS
} from '@/components/RdwInsights.helpers'
import RdwFleetRank from '@/components/RdwFleetRank'
import { kwToHp, type OwnFigures } from '@/components/RdwSpecs.helpers'

type Props = {
  specs: RdwSpecs
  own?: OwnFigures
  fuel?: string | null
  /** Passenger car: the fleet histograms cover only those, so the rank bars show only then. */
  passenger?: boolean
  locale: string
}

type StatProps = { value: string; label: string; hint?: string }

const MAX_HORSES = 12
const MIN_TRACK_KMH = 140
const COUNTRY_ROAD_KMH = 90
const MOTORWAY_KMH = 130

const toPercent = (fraction: number): string => `${(fraction * 100).toFixed(1)}%`

function Stat({ value, label, hint }: StatProps): ReactNode {
  return (
    <div className="flex-1 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-center" title={hint}>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
    </div>
  )
}

/**
 * "Performance" in the Engine group: power per tonne and an estimated 0-100 time, the top speed on a track between
 * everyday speeds (a sprinter, a horse, a cheetah, a train) with the Ukrainian limits ticked, and the power in horses.
 * Everything is derived from the Specs figures above it; estimates are labelled so.
 */
export default function RdwPerformance({ specs, own, fuel, passenger = false, locale }: Props): ReactNode {
  const { t } = useTranslation()
  const kw = own?.powerKw ?? specs.powerKw?.median ?? null
  if (!kw) return null

  const kerb = kerbMassOf(specs, own)
  const topSpeed = specs.topSpeedKmh ? Math.round(specs.topSpeedKmh.median) : null
  const hp = kwToHp(kw)
  const equivalents = powerEquivalents(kw)
  const rank = topSpeed ? rankSpeed(topSpeed) : null
  const trackMax = topSpeed ? Math.max(MIN_TRACK_KMH, Math.ceil((topSpeed * 1.1) / 10) * 10) : MIN_TRACK_KMH
  const cap = topSpeed ? Math.min(topSpeed, MOTORWAY_KMH) : null
  const fmtTrip = (kmh: number): string => {
    const { hours, minutes } = tripTime(KYIV_LVIV_KM, kmh)
    return t('rdw.perf.tripTime', { hours, minutes })
  }

  return (
    <div className="my-2 rounded-lg bg-[var(--color-surface)]/20 p-3">
      <p className="mb-2 text-sm font-medium">⚡ {t('rdw.perf.title')}</p>

      <div className="flex gap-2">
        <Stat value={`${hp} ${t('rdw.unitHp')}`} label={t('rdw.perf.power')} />
        {kerb && (
          <Stat
            value={`${hpPerTonne(kw, kerb)}`}
            label={t('rdw.perf.hpPerTonne')}
            hint={t('rdw.perf.hpPerTonneHint')}
          />
        )}
        {kerb && (
          <Stat
            value={`~${estimateZeroTo100(kw, kerb).toLocaleString(locale, { minimumFractionDigits: 1 })} ${t('rdw.perf.sec')}`}
            label={t('rdw.perf.zeroTo100')}
            hint={t('rdw.perf.zeroTo100Hint')}
          />
        )}
      </div>

      {passenger && <RdwFleetRank specs={specs} own={own} fuel={fuel} kw={kw} />}

      {topSpeed && (
        <div className="mt-3">
          <div
            role="img"
            aria-label={t('rdw.perf.trackLabel', { speed: topSpeed })}
            className="relative mx-3 mt-5 mb-6 h-2 rounded-full bg-[var(--color-border)]"
          >
            {UA_SPEED_LIMITS.map(limit => (
              <span
                key={limit}
                className="absolute inset-y-0 w-px bg-[var(--color-muted)]/60"
                style={{ left: toPercent(limit / trackMax) }}
              >
                <span className="absolute top-3 -translate-x-1/2 text-[10px] text-[var(--color-muted)]">{limit}</span>
              </span>
            ))}

            {SPEED_ANCHORS.filter(a => a.kmh <= trackMax).map(a => (
              <span
                key={a.key}
                title={`${t(`rdw.perf.anchor.${a.key}`)} · ${a.kmh} ${t('rdw.unitKmh')}`}
                className="absolute -top-5 -translate-x-1/2 text-base"
                style={{ left: toPercent(a.kmh / trackMax) }}
              >
                {a.icon}
              </span>
            ))}

            <span
              className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-primary)]"
              style={{ width: toPercent(topSpeed / trackMax) }}
            />
            <span
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg"
              style={{ left: toPercent(topSpeed / trackMax) }}
            >
              🚗
            </span>
          </div>

          <p className="text-sm">
            {t('rdw.perf.topSpeed', { speed: topSpeed })}{' '}
            {rank?.slower && t('rdw.perf.beats', { name: t(`rdw.perf.anchor.${rank.slower.key}`) })}{' '}
            {rank?.faster && t('rdw.perf.loses', { name: t(`rdw.perf.anchor.${rank.faster.key}`) })}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {t('rdw.perf.limitsNote')}
            {cap && cap > COUNTRY_ROAD_KMH && (
              <>
                {' '}
                {t('rdw.perf.trip', {
                  km: KYIV_LVIV_KM,
                  slow: fmtTrip(COUNTRY_ROAD_KMH),
                  fast: fmtTrip(cap),
                  cap
                })}
              </>
            )}
          </p>
        </div>
      )}

      <p className="mt-3 text-sm" title={t('rdw.perf.horsesHint')}>
        <span aria-hidden className="mr-1 tracking-tight">
          {'🐎'.repeat(Math.min(equivalents.horses, MAX_HORSES))}
          {equivalents.horses > MAX_HORSES && ` ×${equivalents.horses}`}
        </span>
        {t('rdw.perf.horses', { horses: equivalents.horses })}
      </p>
      <p className="text-xs text-[var(--color-muted)]">
        {t('rdw.perf.equivalents', {
          people: equivalents.people.toLocaleString(locale),
          kettles: equivalents.kettles.toLocaleString(locale)
        })}
      </p>
    </div>
  )
}
