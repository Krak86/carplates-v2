import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import CaRecallList from '@/components/CaRecallList'
import GoogleTranslateLink from '@/components/GoogleTranslateLink'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import MarketFlag from '@/components/MarketFlag'
import NhtsaRecallList from '@/components/NhtsaRecallList'
import RdwRecallField from '@/components/RdwRecallField'
import RecallTranslateAll from '@/components/RecallTranslateAll'
import {
  categoryKey,
  formatOpenShare,
  formatRecallDate,
  formatVehicleCount,
  hazardKey,
  RECALLS_PREVIEW
} from '@/components/RdwRecalls.helpers'
import SectionCount from '@/components/SectionCount'
import SectionHeader from '@/components/SectionHeader'
import ShareButton from '@/components/ShareButton'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { cn } from '@/lib/cn'
import { caRecallsQuery, nhtsaComplaintsQuery, nhtsaRecallsQuery, rdwQuery, rdwRecallsQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  /** Registry kind text: only used to read the (already cached) RDW specs for the open-recall share. */
  kind?: string | null
}

/**
 * "Recalls" block: recall campaigns the Dutch authority RDW (open data, CC0) lists for this make/model (EU), then the US
 * campaigns and an owner-complaint summary NHTSA holds for this model-year (public domain). Model-level and
 * market-labelled — it says nothing about whether this particular car is affected. Collapsed by default (open from a
 * `?section=recalls` share link); renders nothing while loading, on error, or without a match.
 */
export default function RdwRecalls({ brand, model, year, kind }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'recalls'
  const [open, setOpen] = useState(() => isShared)
  const [expanded, setExpanded] = useState(false)
  // Campaign codes whose header shows RDW's Dutch instead of the machine translation.
  const [originals, setOriginals] = useState<string[]>([])
  const sectionRef = useRef<HTMLDivElement>(null)
  const recalls = useQuery({ ...rdwRecallsQuery(brand ?? '', model ?? ''), enabled: !!(brand && model) && open })
  const data = recalls.data
  // Same query key as the Specs block: shared cache, no second request.
  const { data: specs } = useQuery({
    ...rdwQuery(brand ?? '', model ?? '', year ?? 0, kind),
    enabled: !!(brand && model && year)
  })
  const match = data?.match
  // US (NHTSA) campaigns are per model-year, so they need the year; a failed or empty answer just leaves the section out.
  const usEnabled = !!(brand && model && year) && open
  const usRecalls = useQuery({ ...nhtsaRecallsQuery(brand ?? '', model ?? '', year ?? 0), enabled: usEnabled })
  const usComplaints = useQuery({ ...nhtsaComplaintsQuery(brand ?? '', model ?? '', year ?? 0), enabled: usEnabled })
  const us = usRecalls.data && usRecalls.data.total > 0 ? usRecalls.data : null
  const complaints = usComplaints.data && usComplaints.data.total > 0 ? usComplaints.data : null
  // Canadian campaigns with no US twin (persisted reference data), per model-year like the US ones.
  const caRecalls = useQuery({ ...caRecallsQuery(brand ?? '', model ?? '', year ?? 0), enabled: usEnabled })
  const ca = caRecalls.data?.match ?? null
  const hasAny = !!(match || us || complaints || ca)
  // Complaints are not recalls: a complaints-only car shows no count rather than "(0)".
  const recallTotal = (match?.total ?? 0) + (us?.total ?? 0) + (ca?.total ?? 0)
  const usPending = usEnabled && (usRecalls.isLoading || usComplaints.isLoading || caRecalls.isLoading)

  useEffect(() => {
    if (isShared && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared])

  if (!brand || !model) return null

  const shown = match ? (expanded ? match.recalls : match.recalls.slice(0, RECALLS_PREVIEW)) : []
  const hiddenCount = match ? match.recalls.length - shown.length : 0
  const locale = i18n.language === 'ua' ? 'uk' : i18n.language
  const name = match ? `${match.makeName} ${match.modelName}` : ''
  const openShare = formatOpenShare(specs?.match?.specs.openRecallShare)
  const info = hasAny
    ? [
        match && t('recalls.info.lead', { name }),
        t('recalls.info.model'),
        match?.how === 'prefix' && t('recalls.info.loose'),
        match?.crossMake && t('recalls.info.crossMake', { name }),
        match && t('recalls.info.dutch'),
        match && t('recalls.info.credit'),
        (us || complaints) && t('nhtsa.info.credit'),
        ca && t('ca.info.credit')
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="📣"
        title={
          <>
            {t('recalls.title')} <SectionCount count={recallTotal} />
          </>
        }
        info={
          hasAny && (
            <InfoPopover label={t('vin.info.about', { field: t('recalls.title') })} title={t('recalls.title')}>
              <InfoText text={info} highlight={[name, 'RDW', 'NHTSA', 'Transport Canada']} />
            </InfoPopover>
          )
        }
        actions={<ShareButton section="recalls" label={t('share.button', { section: t('recalls.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('recalls.show')}
        hideLabel={t('recalls.hide')}
      />

      <div
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          {recalls.isLoading && <p className="mt-2 text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
          {recalls.isError && <p className="mt-2 text-base text-[var(--color-muted)]">{t('result.error')}</p>}
          {recalls.isSuccess && !hasAny && !usPending && (
            <p className="mt-2 text-base text-[var(--color-muted)]">{t('section.empty')}</p>
          )}

          {hasAny && (
            <div className="mt-2 space-y-1 rounded-lg bg-[var(--color-surface)]/20 p-3 text-sm">
              <p className="font-medium">{t('recalls.what.title')}</p>
              <p>{t('recalls.what.body')}</p>
              <p className="text-[var(--color-muted)]">{t('recalls.what.ukraine')}</p>
            </div>
          )}

          {match && (
            <VinToggleSection
              nested
              icon="📂"
              showLabel={t('vin.group.show')}
              hideLabel={t('vin.group.hide')}
              title={
                <>
                  <MarketFlag market="NL" /> {t('recalls.market')}{' '}
                  <span className="text-sm font-normal text-[var(--color-muted)]">({match.total})</span>
                </>
              }
              info={
                <InfoPopover label={t('vin.info.about', { field: t('recalls.market') })} title={t('recalls.market')}>
                  <InfoText text={t('recalls.marketHint')} highlight={['RDW']} />
                </InfoPopover>
              }
            >
              <p className="text-xs text-[var(--color-muted)]">
                {t('recalls.footnote', { name, count: match.total })}
                {openShare && ` ${t('recalls.openShare', { share: openShare, year: specs?.match?.specs.year })}`}
              </p>

              <ul className="mt-2 divide-y divide-[var(--color-border)]">
                {shown.map(recall => {
                  const date = formatRecallDate(recall.publishedAt, locale)
                  const total = formatVehicleCount(recall.vehiclesTotal, locale)
                  const local = formatVehicleCount(recall.vehiclesNational, locale)
                  const catKey = recall.category ? categoryKey(recall.category) : null
                  const hazards = recall.hazards.map(h => {
                    const key = hazardKey(h)
                    return key ? t(key) : h
                  })
                  const tr = recall.translations?.[locale]
                  return (
                    <li key={recall.code} className="py-2">
                      <details>
                        <summary className="cursor-pointer text-base">
                          <span className="mr-2 inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 align-middle text-xs text-[var(--color-muted)]">
                            <MarketFlag market={recall.market ?? 'NL'} className="h-3 w-4" />
                            {t(`recalls.market.${recall.market ?? 'NL'}`, { defaultValue: recall.market ?? 'NL' })}
                          </span>
                          {tr?.defect && !originals.includes(recall.code) ? (
                            <span>{tr.defect}</span>
                          ) : (
                            <span lang="nl">{recall.defect ?? recall.category ?? recall.code}</span>
                          )}
                          {tr?.defect && (
                            <span className="ml-2 text-xs text-[var(--color-muted)]">
                              {originals.includes(recall.code) ? t('recalls.originalNl') : t('recalls.aiTranslation')}
                              {' · '}
                              <button
                                type="button"
                                onClick={e => {
                                  e.preventDefault() // inside <summary>: do not toggle the <details>
                                  setOriginals(list =>
                                    list.includes(recall.code)
                                      ? list.filter(c => c !== recall.code)
                                      : [...list, recall.code]
                                  )
                                }}
                                className="underline hover:no-underline"
                              >
                                {originals.includes(recall.code)
                                  ? t('recalls.showTranslation')
                                  : t('recalls.showOriginal')}
                              </button>
                            </span>
                          )}
                          {recall.defect && (!tr?.defect || originals.includes(recall.code)) && (
                            <span className="ml-2">
                              <GoogleTranslateLink text={recall.defect} from="nl" />
                            </span>
                          )}
                          <span className="ml-2 text-xs text-[var(--color-muted)]">
                            {[date, recall.producer].filter(Boolean).join(' · ')}
                          </span>
                        </summary>

                        <dl className="mt-2 space-y-2 text-sm">
                          {recall.category && (
                            <RdwRecallField
                              label={t('recalls.category')}
                              value={catKey ? t(catKey) : recall.category}
                              dutch={!catKey}
                              info={t('recalls.about.category')}
                            />
                          )}
                          {recall.defect && tr?.defect && (
                            <RdwRecallField
                              label={t('recalls.defect')}
                              value={recall.defect}
                              translated={tr.defect}
                              dutch
                              info={t('recalls.about.defect')}
                            />
                          )}
                          {recall.consequences && (
                            <RdwRecallField
                              label={t('recalls.consequences')}
                              value={recall.consequences}
                              translated={tr?.consequences}
                              dutch
                              info={t('recalls.about.consequences')}
                            />
                          )}
                          {hazards.length > 0 && (
                            <RdwRecallField
                              label={t('recalls.hazards')}
                              value={hazards.join('; ')}
                              info={t('recalls.about.hazards')}
                            />
                          )}
                          {recall.remedy && (
                            <RdwRecallField
                              label={t('recalls.remedy')}
                              value={recall.remedy}
                              translated={tr?.remedy}
                              dutch
                              info={t('recalls.about.remedy')}
                            />
                          )}
                          {total && (
                            <RdwRecallField
                              label={t('recalls.vehicles')}
                              value={local ? t('recalls.vehiclesBoth', { total, local }) : total}
                              info={t('recalls.about.vehicles')}
                            />
                          )}
                          <RdwRecallField
                            label={t('recalls.code')}
                            value={recall.code}
                            info={t('recalls.about.code')}
                          />
                        </dl>

                        {!tr && (
                          <RecallTranslateAll texts={[recall.defect, recall.consequences, recall.remedy]} from="nl" />
                        )}

                        {recall.moreInfoUrl && (
                          <a
                            href={recall.moreInfoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm text-[var(--color-primary)] underline hover:no-underline"
                          >
                            {t('recalls.moreInfo')}
                          </a>
                        )}
                      </details>
                    </li>
                  )
                })}
              </ul>

              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="mt-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-border)]/40"
                >
                  {t('recalls.showMore', { count: hiddenCount })}
                </button>
              )}
              {expanded && match.total > match.recalls.length && (
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  {t('recalls.truncated', { shown: match.recalls.length, total: match.total })}
                </p>
              )}
            </VinToggleSection>
          )}

          {(us || complaints) && (
            <VinToggleSection
              nested
              icon="📂"
              showLabel={t('vin.group.show')}
              hideLabel={t('vin.group.hide')}
              title={
                <>
                  <MarketFlag market="US" /> {t('nhtsa.market')}{' '}
                  {us && <span className="text-sm font-normal text-[var(--color-muted)]">({us.total})</span>}
                </>
              }
              info={
                <InfoPopover label={t('vin.info.about', { field: t('nhtsa.market') })} title={t('nhtsa.market')}>
                  <InfoText text={t('nhtsa.marketHint')} highlight={['NHTSA']} />
                </InfoPopover>
              }
            >
              <NhtsaRecallList data={us} complaints={complaints} locale={locale} />
            </VinToggleSection>
          )}

          {ca && (
            <VinToggleSection
              nested
              icon="📂"
              showLabel={t('vin.group.show')}
              hideLabel={t('vin.group.hide')}
              title={
                <>
                  <MarketFlag market="CA" /> {t('ca.market')}{' '}
                  <span className="text-sm font-normal text-[var(--color-muted)]">({ca.total})</span>
                </>
              }
              info={
                <InfoPopover label={t('vin.info.about', { field: t('ca.market') })} title={t('ca.market')}>
                  <InfoText text={t('ca.marketHint')} highlight={['Transport Canada']} />
                </InfoPopover>
              }
            >
              <CaRecallList data={ca} year={year} locale={locale} />
            </VinToggleSection>
          )}
        </div>
      </div>
    </div>
  )
}
