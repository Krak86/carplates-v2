import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import MarketFlag from '@/components/MarketFlag'
import {
  GARAGE_REFS,
  linkById,
  PARKING_REFS,
  ROAD_LIMITS,
  roadChecks,
  type Dims,
  type NormLink
} from '@/components/size/fit'
import SizeExternalLink from '@/components/size/SizeExternalLink'
import { CLASS_CUTS, mmToMetres, type ClassResult, type SizeClass } from '@/components/size/VehicleSize.helpers'

type Props = {
  /** The vehicle's outer size, when known: lets the road limits show where it stands. */
  dims: Dims | null
  cls: ClassResult | null
}

const PASSENGER_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F'] as const

/** "< 3.8" / "3.8–4.2" / "> 5.1" metres of one A–F class from a list of upper cuts. */
function classRange(cuts: readonly number[], index: number, unit: string): string {
  const low = cuts[index - 1]
  const high = cuts[index]
  if (low == null && high != null) return `< ${mmToMetres(high)} ${unit}`
  if (low != null && high == null) return `≥ ${mmToMetres(low)} ${unit}`
  return `${mmToMetres(low ?? 0)}–${mmToMetres(high ?? 0)} ${unit}`
}

type LinkLineProps = { link: NormLink }

function LinkLine({ link }: LinkLineProps): ReactNode {
  const { t } = useTranslation()
  const title = t(`size.link.${link.id}.title`)

  return (
    <span>
      <SizeExternalLink href={link.url}>{title}</SizeExternalLink>{' '}
      <span className="text-[var(--color-muted)]">{link.clause}</span>
      <InfoPopover label={t('vin.info.about', { field: title })} title={title}>
        <InfoText text={t(`size.link.${link.id}.what`)} />
      </InfoPopover>
    </span>
  )
}

/**
 * The reference side: the parking-place norms of Ukraine, Germany and the US with their sources, the typical garage
 * sizes, the ПДР road limits for big vehicles, and the A–F table the class chip is read from.
 */
export default function SizeNormsTab({ dims, cls }: Props): ReactNode {
  const { t } = useTranslation()
  const metre = t('rdw.unitM')
  const checks = dims ? roadChecks(dims) : []
  const currentClass: SizeClass | null = cls?.cls ?? null
  const linkIds = [...new Set(PARKING_REFS.map(r => r.link))]
  const pdr = linkById('ua-pdr')

  return (
    <div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{t('size.tab.norms.intro')}</p>

      <h4 className="mt-3 text-sm font-semibold">{t('size.norms.parking')}</h4>
      <ul className="mt-1 space-y-1.5 text-sm">
        {linkIds.map(id => {
          const link = linkById(id)
          if (!link) return null
          const refs = PARKING_REFS.filter(r => r.link === id)
          return (
            <li key={id} className="flex items-start gap-1.5">
              <MarketFlag market={link.market} className="mt-1 h-3.5 w-5" />
              <span>
                <LinkLine link={link} />
                <span className="block text-xs text-[var(--color-muted)]">
                  {refs
                    .map(r => `${t(`size.bay.${r.id}`)}: ${mmToMetres(r.lengthMm)} × ${mmToMetres(r.widthMm)} ${metre}`)
                    .join(' · ')}
                </span>
              </span>
            </li>
          )
        })}
      </ul>

      <h4 className="mt-3 text-sm font-semibold">{t('size.norms.garage')}</h4>
      <ul className="mt-1 space-y-0.5 text-xs text-[var(--color-muted)]">
        {GARAGE_REFS.map(g => (
          <li key={g.id}>
            {t(`size.garage.${g.id}`)}: {mmToMetres(g.lengthMm)} × {mmToMetres(g.widthMm)} {metre},{' '}
            {t('size.garage.doorLabel')} {mmToMetres(g.doorWidthMm)} × {mmToMetres(g.doorHeightMm)} {metre}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-[var(--color-muted)]">{t('size.garage.typical')}</p>

      <h4 className="mt-3 flex items-center gap-1.5 text-sm font-semibold">
        <MarketFlag market="UA" />
        {t('size.norms.road')}
      </h4>
      <p className="mt-1 text-xs text-[var(--color-muted)]">{t('size.norms.roadIntro')}</p>
      <ul className="mt-1 space-y-0.5 text-sm">
        {(['width', 'height', 'length'] as const).map(id => {
          const limit =
            id === 'width' ? ROAD_LIMITS.widthMm : id === 'height' ? ROAD_LIMITS.heightMm : ROAD_LIMITS.lengthMm
          const check = checks.find(c => c.id === id)
          const label = t(`size.road.${id}`)
          return (
            <li key={id} className="flex flex-wrap items-center gap-1.5">
              <span aria-hidden>{check ? (check.ok ? '✅' : '⛔') : '•'}</span>
              <span>
                {label}: {t('size.road.upTo')} {mmToMetres(limit)} {metre}
              </span>
              {check && (
                <span className="text-xs text-[var(--color-muted)]">
                  ({t('size.road.this')} {mmToMetres(check.valueMm)} {metre})
                </span>
              )}
              <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
                <InfoText text={t(`size.road.about.${id}`)} />
              </InfoPopover>
            </li>
          )
        })}
      </ul>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        {t('size.road.trains', {
          tractor: mmToMetres(ROAD_LIMITS.tractorLengthMm),
          train: mmToMetres(ROAD_LIMITS.trainLengthMm)
        })}
      </p>
      {pdr && (
        <p className="mt-1 text-xs">
          <LinkLine link={pdr} />
        </p>
      )}

      <h4 className="mt-3 flex items-center gap-1.5 text-sm font-semibold">
        {t('size.norms.classes')}
        <InfoPopover label={t('vin.info.about', { field: t('size.norms.classes') })} title={t('size.norms.classes')}>
          <InfoText text={t('size.about.class')} />
        </InfoPopover>
      </h4>
      <table className="mt-1 w-full text-left text-sm">
        <thead className="text-xs text-[var(--color-muted)]">
          <tr>
            <th className="py-0.5 pr-2 font-normal">{t('size.norms.class')}</th>
            <th className="py-0.5 pr-2 font-normal">{t('size.norms.hatch')}</th>
            <th className="py-0.5 font-normal">{t('size.norms.sedan')}</th>
          </tr>
        </thead>
        <tbody>
          {PASSENGER_CLASSES.map((c, i) => (
            <tr key={c} className={c === currentClass ? 'bg-primary/10 font-medium' : undefined}>
              <td className="py-0.5 pr-2">{t(`size.class.${c}`)}</td>
              <td className="py-0.5 pr-2">{classRange(CLASS_CUTS.compact, i, metre)}</td>
              <td className="py-0.5">{classRange(CLASS_CUTS.long, i, metre)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-xs text-[var(--color-muted)]">{t('size.norms.classesNote')}</p>
    </div>
  )
}
