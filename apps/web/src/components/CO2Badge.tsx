import type { ReactNode } from 'react'
import { co2Band, co2Score, isSmallRdwSample } from '@carplates/shared'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { approxCount } from '@/components/RdwSpecs.helpers'
import { CO2_BAND_COLOR, co2ReferenceLinks, formatRange, isSmallEmissionsSample } from '@/components/CO2Badge.helpers'
import InfoPopover from '@/components/InfoPopover'

type Props = {
  /** Combined-cycle tailpipe CO2 across every matched trim — min/max are equal for a single match. */
  co2GKmMin: number
  co2GKmMax: number
  l100kmMin: number | null
  l100kmMax: number | null
  /** Pure EVs only (kWh/100 km); shown instead of L/100 km. */
  evKwh100km?: number | null
  /** Test procedure the numbers come from ("EPA" | "NEDC" | "WLTP"); always shown next to them. */
  cycle: string
  /** Advanced-search link listing the vehicles the estimate was matched on. */
  similarHref?: string
  /** Reference entries (trim / engine versions) the range was taken from. */
  matches?: number
  /** Model year of those entries, and the car's own year — differ when the nearest year stood in. */
  modelYear?: number
  carYear?: number | null
  /** Where the figures come from: the EPA / EEA reference data (default) or the Dutch register when that has none. */
  source?: 'rdw'
  /** The g/km the score is computed from, when the range midpoint would misrepresent it (e.g. a skewed median). */
  scoreGKm?: number
}

/** Cloud-with-CO₂ glyph, filled with the band colour. */
function CloudIcon({ color }: { color: string }): ReactNode {
  return (
    <svg viewBox="0 0 48 32" width="44" height="30" aria-hidden>
      <path
        d="M13 28a9 9 0 0 1-1.5-17.9A11 11 0 0 1 33 8.5 9.5 9.5 0 0 1 36 28Z"
        fill={color}
        stroke="rgb(0 0 0 / 0.15)"
        strokeWidth="1"
      />
      <text x="24" y="21" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="inherit">
        CO₂
      </text>
    </svg>
  )
}

/**
 * Emissions "badness" badge: 0 = clean, 100 = worst, scored from tailpipe CO2 (g/km) at the midpoint of
 * the matched range. Always framed as an estimate for similar vehicles — never an exact figure for this car.
 */
export default function CO2Badge({
  co2GKmMin,
  co2GKmMax,
  l100kmMin,
  l100kmMax,
  evKwh100km,
  cycle,
  similarHref,
  matches,
  modelYear,
  carYear,
  source,
  scoreGKm
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const score = co2Score(scoreGKm ?? (co2GKmMin + co2GKmMax) / 2) ?? 0
  const color = CO2_BAND_COLOR[co2Band(score)]
  const co2 = formatRange(co2GKmMin, co2GKmMax)
  const consumption = formatRange(l100kmMin, l100kmMax, 1)
  const isRdw = source === 'rdw'
  const isSmall = matches != null && (isRdw ? isSmallRdwSample(matches) : isSmallEmissionsSample(matches))
  const count =
    matches == null ? 0 : isRdw ? approxCount(matches, i18n.language === 'ua' ? 'uk' : i18n.language) : matches
  const isNearYear = modelYear != null && carYear != null && modelYear !== carYear

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      {matches != null && modelYear != null && (
        <div className="mb-2 space-y-0.5 text-xs text-[var(--color-muted)]">
          <p>
            {t(isRdw ? 'co2.sampleRdw' : isNearYear ? 'co2.sampleNear' : 'co2.sample', {
              n: count,
              year: modelYear,
              carYear
            })}
          </p>
          {isSmall && <p>⚠️ {t(isRdw ? 'rdw.smallSample' : 'co2.smallSample', { n: matches })}</p>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <CloudIcon color={color} />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl leading-none font-bold" style={{ color }}>
              {score}
            </span>
            <span className="text-xs text-[var(--color-muted)]">/ 100 · {t('co2.score')}</span>
          </div>

          <div
            className="relative mt-2 h-2 rounded-full"
            style={{
              background: `linear-gradient(to right, ${CO2_BAND_COLOR.green}, ${CO2_BAND_COLOR.yellow}, ${CO2_BAND_COLOR.orange}, ${CO2_BAND_COLOR.red})`
            }}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score}
            aria-label={t('co2.title')}
          >
            <span
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${score}%`, background: color }}
            />
          </div>
        </div>

        <InfoPopover label={t('co2.title')} title={t('co2.title')}>
          <div className="space-y-2 text-sm">
            <p>{t('co2.infoScore')}</p>
            <p className="text-[var(--color-muted)]">{t('co2.infoCycle', { cycle })}</p>
            <p className="text-[var(--color-muted)]">{t('co2.infoWltp')}</p>
            <p className="text-[var(--color-muted)]">{t('co2.infoSources')}</p>
            <p className="text-[var(--color-muted)]">{t('co2.infoEstimate')}</p>
            {matches != null && !isRdw && (
              <p className="text-[var(--color-muted)]">{t('co2.infoSample', { n: matches })}</p>
            )}
            {isRdw && <p className="text-[var(--color-muted)]">{t('co2.infoRdw')}</p>}
            {isSmall && (
              <p className="text-[var(--color-muted)]">
                ⚠️ {t(isRdw ? 'rdw.info.small' : 'co2.infoSmall', { n: matches })}
              </p>
            )}

            <div>
              <div className="font-medium">{t('co2.linksTitle')}</div>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {co2ReferenceLinks(i18n.language).map(link => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-primary)] underline"
                    >
                      {t(link.labelKey)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </InfoPopover>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
        {co2 && (
          <span>
            <span className="font-medium">{co2}</span> {t('co2.unitGKm')}
          </span>
        )}
        {consumption && (
          <span>
            <span className="font-medium">{consumption}</span> {t('co2.unitL100')}
          </span>
        )}
        {evKwh100km != null && (
          <span>
            <span className="font-medium">{evKwh100km}</span> {t('co2.unitKwh100')}
          </span>
        )}
        <span className="text-[var(--color-muted)]">
          {t('co2.cycleNote', { cycle })} ·{' '}
          {similarHref ? (
            <Link viewTransition to={similarHref} className="text-[var(--color-primary)] underline hover:no-underline">
              {t('co2.similar')}
            </Link>
          ) : (
            t('co2.similar')
          )}
        </span>
      </div>
    </div>
  )
}
