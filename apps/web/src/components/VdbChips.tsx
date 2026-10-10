import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import { countryName, isoFlag } from '@/components/vin/helpers'
import { COVERED_MARKETS, decileBand, isRareElsewhere, MAX_ALIASES, MAX_FLAGS } from '@/components/VdbChips.helpers'
import { vdbQuery } from '@/lib/queries'
import { useUiStore } from '@/store/ui-store'

type Props = {
  brand: string | null
  model: string | null
  /** Registry kind text (ЛЕГКОВИЙ, МОТОЦИКЛ …): picks which catalog kinds the model may match. */
  kind?: string | null
}

const CHIP =
  'chip-market chip-tone inline-flex animate-chip-in items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-[var(--color-fg)]'

/**
 * Cross-market chips from the VehiclesDB catalog (CC-BY): where else the model is sold and how popular it is across
 * those markets, plus one "?" explaining every chip. Flows in the parent's wrapping chip row (`contents`) and renders
 * nothing while loading, on error, or without a catalog match.
 */
export default function VdbChips({ brand, model, kind }: Props): ReactNode {
  const { t } = useTranslation()
  const lang = useUiStore(s => s.lang)
  const { data } = useQuery({ ...vdbQuery(brand ?? '', model ?? '', kind), enabled: !!(brand && model) })
  const match = data?.match
  if (!match) return null

  // Intl.DisplayNames only resolves upper-case region codes; the catalog stores them lower-case.
  const nameOf = (code: string): string => countryName(code.toUpperCase(), lang)
  const names = (codes: readonly string[]): string => codes.map(nameOf).join(', ')
  // One "ES — Spain" bullet per covered register: the short code the flags stand for, with the full name.
  const legend = COVERED_MARKETS.map(c => `${c.toUpperCase()} — ${nameOf(c)}`)
  // Answers persisted in IndexedDB before crossMake/aliases existed lack them (the cache is not re-parsed with Zod).
  const aliases = match.aliases ?? []
  // Other names of the same car: the catalog's make+model when it files it under another make, then its aliases.
  const otherNames = [...(match.crossMake ? [`${match.makeName} ${match.modelName}`] : []), ...aliases]
  const others = match.countries.filter(c => c !== 'ua')
  const decile = match.globalDecile
  const showDecile = decile != null && !match.uaOnly
  const rare = isRareElsewhere(decile, match.uaOnly)
  const band = decile == null ? '' : decileBand(decile)

  // One "name — description" bullet per chip actually shown, then the covered registers and the credit.
  const info = [
    t('vdb.info.lead', { name: `${match.makeName} ${match.modelName}` }),
    match.how === 'prefix' && t('vdb.info.loose'),
    match.crossMake && t('vdb.info.crossMake', { name: `${match.makeName} ${match.modelName}` }),
    aliases.length > 0 && t('vdb.info.aliases', { names: aliases.join(', ') }),
    match.uaOnly && t('vdb.info.uaOnly'),
    others.length > 0 && t('vdb.info.alsoSold', { countries: names(others) }),
    showDecile && t('vdb.info.decile', { band, count: match.countries.length, markets: names(match.countries) }),
    rare && t('vdb.info.rare'),
    t('vdb.info.credit'),
    ...legend
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="contents">
      {otherNames.length > 0 && (
        <InfoPopover
          label={t('vdb.info.title')}
          title={t('vdb.info.title')}
          anchor={
            <span className={CHIP}>
              <span aria-hidden>🏷️</span>
              {t('vdb.aliases', { names: otherNames.slice(0, MAX_ALIASES).join(', ') })}
            </span>
          }
        >
          {[
            match.crossMake && t('vdb.info.crossMake', { name: `${match.makeName} ${match.modelName}` }),
            aliases.length > 0 && t('vdb.info.aliases', { names: aliases.join(', ') })
          ]
            .filter(Boolean)
            .join(' ')}
        </InfoPopover>
      )}

      {match.uaOnly && (
        <InfoPopover
          label={t('vdb.uaOnly')}
          title={t('vdb.uaOnly')}
          anchor={
            <span className={CHIP}>
              <span aria-hidden>🇺🇦</span>
              {t('vdb.uaOnly')}
            </span>
          }
        >
          {t('vdb.info.uaOnly')}
        </InfoPopover>
      )}

      {others.length > 0 && (
        <InfoPopover
          label={t('vdb.alsoSold')}
          title={t('vdb.alsoSold')}
          anchor={
            <span className={CHIP}>
              <span aria-hidden>🌍</span>
              {t('vdb.alsoSold')}
              <span aria-hidden>{others.slice(0, MAX_FLAGS).map(isoFlag).join(' ')}</span>
              {others.length > MAX_FLAGS && <span aria-hidden>+{others.length - MAX_FLAGS}</span>}
              <span className="sr-only">{names(others)}</span>
            </span>
          }
        >
          {t('vdb.info.alsoSold', { countries: names(others) })}
        </InfoPopover>
      )}

      {showDecile && (
        <InfoPopover
          label={t('vdb.decile', { band, count: match.countries.length })}
          title={t('vdb.decile', { band, count: match.countries.length })}
          anchor={
            <span className={CHIP}>
              <span aria-hidden>📊</span>
              {t('vdb.decile', { band, count: match.countries.length })}
            </span>
          }
        >
          {t('vdb.info.decile', { band, count: match.countries.length, markets: names(match.countries) })}
        </InfoPopover>
      )}

      {rare && (
        <InfoPopover
          label={t('vdb.rare')}
          title={t('vdb.rare')}
          anchor={
            <span className={CHIP}>
              <span aria-hidden>💎</span>
              {t('vdb.rare')}
            </span>
          }
        >
          {t('vdb.info.rare')}
        </InfoPopover>
      )}

      <InfoPopover label={t('vin.info.about', { field: t('vdb.info.title') })} title={t('vdb.info.title')}>
        <InfoText text={info} highlight={[`${match.makeName} ${match.modelName}`, ...aliases]} />
      </InfoPopover>
    </div>
  )
}
