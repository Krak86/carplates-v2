import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import ChipChevronButton from '@/components/ChipChevronButton'
import Flag from '@/components/Flag'
import InfoPopover from '@/components/InfoPopover'
import { buildOriginChip } from '@/components/OriginSection.helpers'
import { countryLabel } from '@/components/vin/helpers'
import { originQuery } from '@/lib/queries'

type Props = {
  /** Registry brand (no model). */
  brand: string | null
  model?: string | null
  year?: number | null
  vin?: string | null
  /** NHTSA plant country as ISO 3166-1 alpha-2, and city, when the VIN was decoded. */
  plantCountry?: string | null
  plantCity?: string | null
  /** The chevron: mount the origin section, open it and scroll to it. */
  onOpenSection: () => void
}

const CHIP =
  'chip-market chip-tone inline-flex animate-chip-in items-center gap-1.5 rounded-full border py-0.5 pr-1 pl-2 text-xs text-[var(--color-fg)]'

// Hovering / focusing the chevron warms the section's chunk, so the scroll lands on a ready section.
const loadSection = (): Promise<typeof import('@/components/OriginSection')> => import('@/components/OriginSection')

/**
 * Flags chip in the card header: brand home country, the owner's when it is from elsewhere, and the assembly plant, each
 * only when known. The popover names every flag; the chevron opens the "Where it comes from" section. Shares its query
 * with the section. Renders nothing while loading, on error or when no origin fact is known.
 */
export default function OriginChip({
  brand,
  model,
  year,
  vin,
  plantCountry,
  plantCity,
  onOpenSection
}: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const { data } = useQuery({
    ...originQuery({ brand: brand ?? '', model, year, vin, plantCountry, plantCity }),
    enabled: !!brand
  })
  const chip = buildOriginChip(data, year)
  if (!chip) return null

  const title = t('origin.chip.title')
  const name = (code: string): string => countryLabel(code, i18n.language, t)
  const brandName = chip.brand
    ? chip.brand.ukrainianSsr
      ? `${name(chip.brand.country)} (${t('origin.country.ukrainianSsr')})`
      : name(chip.brand.country)
    : null

  // One row per flag: the flag, then what it stands for. The chip shows the flags only, so this is the legend.
  const rows = [
    chip.brand &&
      brandName && { key: 'brand', code: chip.brand.country, text: t('origin.chip.brand', { country: brandName }) },
    chip.owner && {
      key: 'owner',
      code: chip.owner.country,
      text: t('origin.chip.owner', { owner: chip.owner.name, country: name(chip.owner.country) })
    },
    chip.plant && {
      key: 'plant',
      code: chip.plant.country,
      text: t('origin.chip.plant', {
        place: [chip.plant.city, name(chip.plant.country)].filter(Boolean).join(', ')
      })
    }
  ].filter(row => !!row)

  return (
    <span className="inline-flex items-center gap-0.5">
      <span className={CHIP}>
        <span aria-hidden>🧭</span>

        {rows.map(row => (
          <Flag key={row.key} code={row.code} label={row.text} />
        ))}

        <InfoPopover label={title} title={title}>
          <ul className="m-0 list-none space-y-1.5 p-0">
            {rows.map(row => (
              <li key={row.key} className="flex items-center gap-2">
                <Flag code={row.code} />
                {row.text}
              </li>
            ))}
          </ul>

          <p className="mt-2 mb-0 text-xs text-[var(--color-muted)]">{t('origin.explainer.disclaimer')}</p>
        </InfoPopover>
      </span>

      <ChipChevronButton label={t('origin.chip.expand')} onClick={onOpenSection} onWarm={() => void loadSection()} />
    </span>
  )
}
