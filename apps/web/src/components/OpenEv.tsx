import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { resolveFuelCategories } from '@carplates/shared'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import { closestVariantIndex, formatKw, formatPorts, OPEN_ELECTRIC_EVENT } from '@/components/OpenEv.helpers'
import OpenEvRow from '@/components/OpenEvRow'
import SectionHeader from '@/components/SectionHeader'
import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'
import { openEvQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  /** Registry fuel text: the block only appears for a car the register calls electric (or hybrid with electricity). */
  fuel: string | null
}

/**
 * "Electric" block from Open EV Data (MIT): usable battery, consumption and charging of the electric variants listed for
 * this make/model. Model-level, European spec, data from 2020 or earlier. The header shows how many variants exist; the
 * variants themselves are rendered only while the block is open (header click, a `?section=electric` share link, or the
 * 🔌 link in basic data). Renders nothing for a combustion car, while loading, on error, or without a match.
 */
export default function OpenEv({ brand, model, year, fuel }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'electric'
  const [open, setOpen] = useState(() => isShared)
  const sectionRef = useRef<HTMLDivElement>(null)
  const isElectric = resolveFuelCategories(fuel).includes('electric')
  const { data } = useQuery({ ...openEvQuery(brand ?? '', model ?? ''), enabled: !!(brand && model) && isElectric })
  const match = isElectric ? data?.match : null

  useEffect(() => {
    if (isShared && match && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared, match])

  // The basic-data 🔌 link asks an already mounted block to open and scroll into view.
  useEffect(() => {
    const handleOpen = (): void => {
      setOpen(true)
      if (sectionRef.current) scrollElementIntoView(sectionRef.current)
    }
    window.addEventListener(OPEN_ELECTRIC_EVENT, handleOpen)
    return (): void => window.removeEventListener(OPEN_ELECTRIC_EVENT, handleOpen)
  }, [])

  if (!match) return null

  const name = `${match.makeName} ${match.modelName}`
  const nearest = closestVariantIndex(match.variants, year)
  const info = [
    t('ev.info.lead', { name }),
    t('ev.info.model'),
    match.how === 'prefix' && t('ev.info.loose'),
    match.crossMake && t('ev.info.crossMake', { name }),
    t('ev.info.old'),
    t('ev.info.credit')
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="🔌"
        title={
          <>
            {t('ev.title')}{' '}
            <span className="text-sm font-normal text-[var(--color-muted)]">({match.variants.length})</span>
          </>
        }
        info={
          <InfoPopover label={t('vin.info.about', { field: t('ev.title') })} title={t('ev.title')}>
            <InfoText text={info} highlight={[name, 'Open EV Data']} />
          </InfoPopover>
        }
        actions={<ShareButton section="electric" label={t('share.button', { section: t('ev.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('ev.show')}
        hideLabel={t('ev.hide')}
      />

      {open && (
        <div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">{t('ev.footnote', { name })}</p>

          <ul className="mt-2 space-y-2">
            {match.variants.map((v, i) => (
              <li
                key={`${v.variant}-${v.releaseYear}-${v.acMaxKw}-${v.batteryKwh}`}
                className={cn(
                  'rounded-lg border border-[var(--color-border)] p-3 text-sm',
                  i === nearest && 'bg-[var(--color-surface)]/20'
                )}
              >
                <p className="font-medium">
                  {[name, v.variant].filter(Boolean).join(' ')}
                  {v.releaseYear && <span className="ml-2 font-normal text-[var(--color-muted)]">{v.releaseYear}</span>}
                  {v.powertrain === 'phev' && (
                    <span className="ml-2 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs font-normal text-[var(--color-muted)]">
                      {t('ev.phev')}
                    </span>
                  )}
                  {i === nearest && (
                    <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">{t('ev.nearest')}</span>
                  )}
                </p>

                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                  {v.batteryKwh && (
                    <OpenEvRow field="battery" label={t('ev.battery')} value={t('ev.kwh', { value: v.batteryKwh })} />
                  )}
                  {v.consumptionKwh100 && (
                    <OpenEvRow
                      field="consumption"
                      label={t('ev.consumption')}
                      value={t('ev.kwh100', { value: v.consumptionKwh100 })}
                    />
                  )}
                  {v.acMaxKw && (
                    <OpenEvRow
                      field="ac"
                      label={t('ev.ac')}
                      value={[
                        formatKw(v.acMaxKw),
                        v.acPhases && t('ev.phases', { count: v.acPhases }),
                        formatPorts(v.acPorts)
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    />
                  )}
                  <OpenEvRow
                    field="dc"
                    label={t('ev.dc')}
                    value={
                      v.dcMaxKw
                        ? [formatKw(v.dcMaxKw), formatPorts(v.dcPorts)].filter(Boolean).join(' · ')
                        : t('ev.noDc')
                    }
                  />
                </dl>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
