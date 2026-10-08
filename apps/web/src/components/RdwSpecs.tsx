import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { isSmallRdwSample, MAX_YEAR_GAP } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { similarVehiclesHref } from '@/components/CO2Badge.helpers'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import {
  appliesToFuel,
  approxCount,
  describeRange,
  altFigure,
  formatPercent,
  SHARE_ROWS,
  SPEC_GROUPS,
  SPEC_ROWS,
  visibleShares,
  type OwnFigures,
  type SpecRange,
  type SpecRowDef
} from '@/components/RdwSpecs.helpers'
import RdwScaleBar from '@/components/RdwScaleBar'
import RdwShareRow from '@/components/RdwShareRow'
import SectionHeader from '@/components/SectionHeader'
import ShareButton from '@/components/ShareButton'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { cn } from '@/lib/cn'
import { rdwQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  /** Registry kind text (ЛЕГКОВИЙ, МОТОЦИКЛ …): picks which RDW vehicle kinds the model may match. */
  kind?: string | null
  /** Registry fuel text: hides the electric rows for a combustion car and the fuel rows for an electric one. */
  fuel?: string | null
  /** What the registry says about this exact car — shown under the typical figure for comparison. */
  own?: OwnFigures
}

type SpecRowProps = {
  def: SpecRowDef
  range: SpecRange
  own: number | null
  locale: string
}

/** Same look as the basic-section rows: muted label chip with a ❓ explainer, value chip on the right. */
function SpecRow({ def, range, own, locale }: SpecRowProps): ReactNode {
  const { t } = useTranslation()
  const label = t(`rdw.${def.key}`)
  const unit = def.unitKey ? t(def.unitKey) : ''
  const { grouped, ...format } = def.format ?? {}
  const { main, spread } = describeRange(range, { ...format, locale: grouped ? locale : undefined })

  return (
    <div className="-mx-4 flex justify-between gap-4 px-4 py-1.5 text-base transition-colors hover:bg-[var(--color-border)]/40">
      <span className="flex items-center gap-1.5 rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-[var(--color-muted)]">
        {label}
        <InfoPopover label={t('vin.info.about', { field: label })} title={label}>
          <InfoText text={t(`rdw.about.${def.key}`)} />
        </InfoPopover>
      </span>

      <span className="flex flex-col items-end rounded bg-[var(--color-surface)]/20 px-1 py-0.5 text-right">
        <span className="font-medium">
          {main}
          {unit && ` ${unit}`}
          {def.alt && (
            <span className="ml-1 font-normal text-[var(--color-muted)]">({altFigure(def.alt, range.median, t)})</span>
          )}
        </span>
        {spread && (
          <span className="text-xs text-[var(--color-muted)]">{t('rdw.range', { range: spread, unit }).trim()}</span>
        )}
        {def.scale && <RdwScaleBar scale={def.scale} range={range} unit={unit} />}
        {own != null && (
          <span className="text-xs text-[var(--color-muted)]">
            {t('rdw.thisCar', { value: `${own} ${unit}`.trim() })}
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * "Specs" block from the Dutch vehicle register (RDW open data, CC0): power, displacement, unladen mass and CO2 of
 * the same make/model/year as registered in the Netherlands. EU-spec, so labelled as such. Collapsed by default (open
 * from a `?section=specs` share link); renders nothing while loading, on error, or without a match — a miss hides it.
 */
export default function RdwSpecs({ brand, model, year, kind, fuel, own }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'specs'
  const [open, setOpen] = useState(() => isShared)
  const sectionRef = useRef<HTMLDivElement>(null)
  const { data } = useQuery({
    ...rdwQuery(brand ?? '', model ?? '', year ?? 0, kind),
    enabled: !!(brand && model && year)
  })
  const match = data?.match

  useEffect(() => {
    if (isShared && match && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, match])

  if (!match) return null

  const { specs } = match
  const isSmall = isSmallRdwSample(specs.n)
  const locale = i18n.language === 'ua' ? 'uk' : i18n.language
  const count = approxCount(specs.n, locale)
  const name = `${match.makeName} ${match.modelName}`
  const info = [
    t('rdw.info.lead', { name }),
    t('rdw.info.sample', { n: count, year: specs.year }),
    isSmall && t('rdw.info.small', { n: specs.n }),
    t('rdw.info.approx'),
    !match.exactYear && t('rdw.info.nearYear', { year: specs.year }),
    match.how === 'prefix' && t('rdw.info.loose'),
    match.crossMake && t('rdw.info.crossMake', { name }),
    t('rdw.info.spread'),
    t('rdw.info.co2'),
    SPEC_ROWS.some(def => def.key === 'price' && def.pick(specs)) && t('rdw.info.price'),
    t('rdw.info.fuelMix'),
    t('rdw.info.credit')
  ]
    .filter(Boolean)
    .join('\n')

  // Rows grouped under headings; a group with nothing to show (no data, or wrong powertrain for this car) is dropped.
  const groups = SPEC_GROUPS.map(key => {
    const rows =
      key === 'fleet'
        ? SHARE_ROWS.map(def => {
            const items = visibleShares(def.pick(specs), def.limit)
            if (items.length === 0) return null
            const chips = items.map(
              i =>
                `${def.itemPrefix ? t(`rdw.${def.itemPrefix}.${i.key}`, { defaultValue: i.key }) : i.key} ${formatPercent(i.share)}`
            )
            return <RdwShareRow key={def.key} rowKey={def.key} chips={chips} />
          })
        : SPEC_ROWS.filter(def => def.group === key && appliesToFuel(def.powertrain, fuel)).map(def => {
            const range = def.pick(specs)
            if (!range) return null
            return (
              <SpecRow
                key={def.key}
                def={def}
                range={range}
                own={own ? (def.own?.(own) ?? null) : null}
                locale={locale}
              />
            )
          })
    return { key, rows: rows.filter(Boolean) }
  }).filter(group => group.rows.length > 0)

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="📐"
        title={t('rdw.title')}
        info={
          <InfoPopover label={t('vin.info.about', { field: t('rdw.title') })} title={t('rdw.title')}>
            <InfoText text={info} highlight={[name, 'RDW']} />
          </InfoPopover>
        }
        actions={<ShareButton section="specs" label={t('share.button', { section: t('rdw.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('rdw.show')}
        hideLabel={t('rdw.hide')}
      />

      <div
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              title={t('rdw.marketHint')}
              className="inline-block rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted)]"
            >
              {t('rdw.market')}
            </span>
            <span className="text-xs text-[var(--color-muted)]">
              {t('rdw.sampleBadge', { n: count, year: specs.year })}
            </span>
          </div>

          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {t('rdw.footnote', { name, n: count, year: specs.year })}{' '}
            {brand && model && year && (
              <Link
                viewTransition
                to={similarVehiclesHref(brand, model, year, MAX_YEAR_GAP)}
                className="text-[var(--color-primary)] underline hover:no-underline"
              >
                {t('rdw.similar')}
              </Link>
            )}
          </p>

          {isSmall && (
            <p className="mt-2 text-xs text-[var(--color-muted)]">⚠️ {t('rdw.smallSample', { n: specs.n })}</p>
          )}

          {groups.map(group => (
            <VinToggleSection
              key={group.key}
              icon="📂"
              defaultOpen={group.key === 'engine'}
              showLabel={t('vin.group.show')}
              hideLabel={t('vin.group.hide')}
              title={
                <>
                  {t(`rdw.group.${group.key}`)}{' '}
                  <span className="text-sm font-normal text-[var(--color-muted)]">({group.rows.length})</span>
                </>
              }
            >
              <div className="divide-y divide-[var(--color-border)]">{group.rows}</div>
            </VinToggleSection>
          ))}
        </div>
      </div>
    </div>
  )
}
