import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { generationSpan } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import SectionCount from '@/components/SectionCount'
import SectionHeader from '@/components/SectionHeader'
import ShareButton from '@/components/ShareButton'
import VinToggleSection from '@/components/vin/VinToggleSection'
import WikiEngineCard from '@/components/WikiEngineCard'
import WikiSourceLine from '@/components/WikiSourceLine'
import WikiSpecRow from '@/components/WikiSpecRow'
import { DIMENSION_KEYS, DIMENSION_LABELS, formatDimension, hasDimensions } from '@/components/WikiSpecs.helpers'
import { cn } from '@/lib/cn'
import { wikiSpecsQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

/**
 * "Generation specs" block from Wikipedia (CC BY-SA, facts only): the engines offered in the generation of this model
 * year, its drive layout and gearbox, and — only where the Dutch register has no row for the model — dimensions, kerb
 * mass and tank volume. Catalogue values for the generation, not for this car; each block names its Wikipedia edition.
 * Collapsed by default (open from `?section=engines`); renders nothing while loading, on error, or without a match.
 */
export default function WikiSpecs({ brand, model, year }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'engines'
  const [open, setOpen] = useState(() => isShared)
  const sectionRef = useRef<HTMLDivElement>(null)
  const { data } = useQuery({
    ...wikiSpecsQuery(brand ?? '', model ?? '', year ?? 0),
    enabled: !!(brand && model && year)
  })
  const match = data?.match

  useEffect(() => {
    if (isShared && match && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, match])

  if (!match) return null

  const locale = i18n.language === 'ua' ? 'uk' : i18n.language
  const name = `${match.makeName} ${match.modelName}`
  const generation = match.generationCode || match.generationLabel || ''
  const span = generationSpan({ yearFrom: match.yearFrom, yearTo: match.yearTo ?? null })
  const engines = match.engines ?? []
  const dims = match.dimensions
  const dimensionRows = dims
    ? DIMENSION_KEYS.map(key => ({ key, value: formatDimension(key, dims, t, locale) })).filter(r => !!r.value)
    : []
  const driveRows = [
    match.layout && { key: 'layout', value: match.layout },
    match.transmission && { key: 'transmission', value: match.transmission }
  ].filter(Boolean) as { key: string; value: string }[]

  const info = [
    t('wikispec.info.lead', { name, generation, span }),
    t('wikispec.info.catalogue'),
    match.crossMake && t('rdw.info.crossMake', { name }),
    dims && hasDimensions(dims) && t('wikispec.info.gap'),
    t('wikispec.info.credit')
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="📖"
        title={
          <>
            {t('wikispec.title')} <SectionCount count={engines.length} />
          </>
        }
        info={
          <InfoPopover label={t('vin.info.about', { field: t('wikispec.title') })} title={t('wikispec.title')}>
            <InfoText text={info} highlight={[name, 'Wikipedia']} />
          </InfoPopover>
        }
        actions={<ShareButton section="engines" label={t('share.button', { section: t('wikispec.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('wikispec.show')}
        hideLabel={t('wikispec.hide')}
      />

      <div
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <p className="mt-2 text-xs text-[var(--color-muted)]">{t('wikispec.footnote', { name, generation, span })}</p>

          {engines.length > 0 && (
            <VinToggleSection
              nested
              icon="📂"
              defaultOpen
              showLabel={t('vin.group.show')}
              hideLabel={t('vin.group.hide')}
              title={
                <>
                  {t('wikispec.engines')} <SectionCount count={engines.length} />
                </>
              }
            >
              <p className="text-xs text-[var(--color-muted)]">{t('wikispec.hint.engines')}</p>
              <div className="divide-y divide-[var(--color-border)]">
                {engines.map(e => (
                  <WikiEngineCard
                    key={`${e.raw}-${e.displacementCc}-${e.powerKw}-${e.chassisCodes?.join()}`}
                    engine={e}
                  />
                ))}
              </div>
              <WikiSourceLine source={match.enginesSource} />
            </VinToggleSection>
          )}

          {driveRows.length > 0 && (
            <VinToggleSection
              nested
              icon="📂"
              showLabel={t('vin.group.show')}
              hideLabel={t('vin.group.hide')}
              title={
                <>
                  {t('wikispec.drive')} <SectionCount count={driveRows.length} />
                </>
              }
            >
              <p className="text-xs text-[var(--color-muted)]">{t('wikispec.hint.drive')}</p>
              <div className="divide-y divide-[var(--color-border)]">
                {driveRows.map(r => (
                  <WikiSpecRow
                    key={r.key}
                    label={t(`wikispec.${r.key}`)}
                    value={r.value}
                    about={t(`wikispec.about.${r.key}`)}
                  />
                ))}
              </div>
              <WikiSourceLine source={match.driveSource} />
            </VinToggleSection>
          )}

          {dimensionRows.length > 0 && (
            <VinToggleSection
              nested
              icon="📂"
              showLabel={t('vin.group.show')}
              hideLabel={t('vin.group.hide')}
              title={
                <>
                  {t('wikispec.dimensions')} <SectionCount count={dimensionRows.length} />
                </>
              }
            >
              <p className="text-xs text-[var(--color-muted)]">{t('wikispec.hint.dimensions')}</p>
              <div className="divide-y divide-[var(--color-border)]">
                {dimensionRows.map(r => (
                  <WikiSpecRow
                    key={r.key}
                    label={t(DIMENSION_LABELS[r.key])}
                    value={r.value ?? ''}
                    about={t(`wikispec.about.${r.key}`)}
                  />
                ))}
              </div>
              <WikiSourceLine source={match.dimensionsSource} />
            </VinToggleSection>
          )}
        </div>
      </div>
    </div>
  )
}
