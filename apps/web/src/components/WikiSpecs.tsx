import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { isCuratedSource } from '@carplates/shared'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { generationSpanText } from '@/components/GenerationChip.helpers'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import SectionCount from '@/components/SectionCount'
import SectionHeader from '@/components/SectionHeader'
import ShareButton from '@/components/ShareButton'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { driveRows } from '@/components/WikiDrive.helpers'
import WikiEngineCard from '@/components/WikiEngineCard'
import WikiSourceLine from '@/components/WikiSourceLine'
import WikiSpecRow from '@/components/WikiSpecRow'
import {
  carMass,
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  engineMatchesCar,
  engineVsCar,
  formatDimension,
  generationYearOf,
  hasDimensions,
  sortEnginesByFit,
  sourceTextLang,
  type OwnCar
} from '@/components/WikiSpecs.helpers'
import { cn } from '@/lib/cn'
import { wikiSpecsQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  /** Registry figures of this car: the matching engine is highlighted and the others show how they differ. */
  own?: OwnCar
  /** Each change opens the section and scrolls to it (0 = never asked) — a link in the Specs block. */
  openSignal?: number
}

/**
 * "Generation specs" block from Wikipedia (CC BY-SA, facts only): the engines offered in the generation of this model
 * year, its drive layout and gearbox, and — only where the Dutch register has no row for the model — dimensions, kerb
 * mass and tank volume. Catalogue values for the generation, not for this car; each block names its Wikipedia edition.
 * The engine matching the car's registry figures is highlighted and listed first. Collapsed by default (open from `?section=engines`); renders nothing while loading, on error, or without a match.
 */
export default function WikiSpecs({ brand, model, year, own, openSignal = 0 }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'engines'
  const [open, setOpen] = useState(() => isShared || openSignal > 0)
  const [seenSignal, setSeenSignal] = useState(openSignal)
  const sectionRef = useRef<HTMLDivElement>(null)
  const { data } = useQuery({
    ...wikiSpecsQuery(brand ?? '', model ?? '', year ?? 0),
    enabled: !!(brand && model && year)
  })
  const match = data?.match

  if (openSignal !== seenSignal) {
    setSeenSignal(openSignal)
    setOpen(true)
  }

  useEffect(() => {
    if ((isShared || openSignal > 0) && match && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, openSignal, match])

  if (!match) return null

  const locale = i18n.language === 'ua' ? 'uk' : i18n.language
  const name = `${match.makeName} ${match.modelName}`
  const generation = match.generationCode || match.generationLabel || ''
  const span = generationSpanText({ yearFrom: match.yearFrom, yearTo: match.yearTo ?? null }, t)
  const engines = sortEnginesByFit(match.engines ?? [], own)
  const hasMatch = engines.some(e => engineMatchesCar(e, own))
  const curated = isCuratedSource(match.enginesSource ?? match.dimensionsSource ?? match.driveSource)
  const yearOf = curated ? null : generationYearOf(year, match.yearFrom, match.yearTo)
  const dims = match.dimensions
  const dimensionRows = dims
    ? DIMENSION_KEYS.map(key => {
        const value = formatDimension(key, dims, t, locale)
        const mass = key === 'kerbKg' ? carMass(own, t, locale) : null
        return { key, value: value && mass ? `${value} (${t('wikispec.thisCar', { value: mass })})` : value }
      }).filter(r => !!r.value)
    : []
  const driveItems = driveRows(match.layout, match.transmission, t)

  const info = [
    curated
      ? t('wikispec.info.leadCurated', { name })
      : generation
        ? t('wikispec.info.lead', { name, generation, span })
        : t('wikispec.info.leadModel', { name, span }),
    t('wikispec.info.catalogue'),
    own && t('wikispec.info.match'),
    match.crossMake && t('rdw.info.crossMake', { name }),
    dims && hasDimensions(dims) && t('wikispec.info.gap'),
    t(curated ? 'wikispec.info.creditCurated' : 'wikispec.info.credit')
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
            <InfoText text={info} highlight={[name, curated ? 'source' : 'Wikipedia']} />
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
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            {curated
              ? t('wikispec.footnoteCurated', { name })
              : generation
                ? t('wikispec.footnote', { name, generation, span })
                : t('wikispec.footnoteModel', { name, span })}
          </p>

          {yearOf && (
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              {yearOf.total
                ? t('wikispec.carYear', { year, n: yearOf.n, total: yearOf.total })
                : t('wikispec.carYearOpen', { year, n: yearOf.n })}
              {own && engines.length > 0 && ` ${t(hasMatch ? 'wikispec.carMatch' : 'wikispec.carNoMatch')}`}
            </p>
          )}

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
                    key={`${e.raw}-${e.displacementCc}-${e.powerKw}-${e.chassisCodes?.join()}-${e.engineCodes?.join()}`}
                    engine={e}
                    matches={engineMatchesCar(e, own)}
                    vsCar={engineVsCar(e, own, t)}
                    sourceLang={sourceTextLang(match.enginesSource)}
                  />
                ))}
              </div>
              <WikiSourceLine source={match.enginesSource} />
            </VinToggleSection>
          )}

          {driveItems.length > 0 && (
            <VinToggleSection
              nested
              icon="📂"
              showLabel={t('vin.group.show')}
              hideLabel={t('vin.group.hide')}
              title={
                <>
                  {t('wikispec.drive')} <SectionCount count={driveItems.length} />
                </>
              }
            >
              <p className="text-xs text-[var(--color-muted)]">{t('wikispec.hint.drive')}</p>
              <div className="divide-y divide-[var(--color-border)]">
                {driveItems.map(r => (
                  <WikiSpecRow
                    key={r.key}
                    label={t(r.labelKey)}
                    value={r.value}
                    about={t(r.aboutKey)}
                    sourceLang={r.raw ? sourceTextLang(match.driveSource) : undefined}
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
