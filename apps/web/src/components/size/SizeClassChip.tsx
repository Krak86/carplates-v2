import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import ChipChevronButton from '@/components/ChipChevronButton'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import { useVehicleSize, type VehicleSizeInput } from '@/components/size/use-vehicle-size'
import { mmToMetres } from '@/components/size/VehicleSize.helpers'
import { upperBrand } from '@/lib/display-brand'
import { readHref } from '@/routes/read/links'

type Props = Omit<VehicleSizeInput, 'vinFields'> & {
  /** The chevron: mount the Size & parking section, open it and scroll to it. */
  onOpenSection: () => void
}

const CHIP =
  'chip-market chip-tone inline-flex animate-chip-in items-center gap-1 rounded-full border py-0.5 pr-1 pl-2 text-xs text-[var(--color-fg)]'

// Hovering / focusing the chevron warms the section's chunk, so the scroll lands on a ready section.
const loadSection = (): Promise<typeof import('@/components/size/VehicleSizeSection')> =>
  import('@/components/size/VehicleSizeSection')

/**
 * "📏 C-class · 4.28 m" chip in the card header: the approximate European size class by length, with a chevron that
 * opens the Size & parking section. Reads only the Specs queries (no VIN), shows nothing without a class, and marks a
 * length that is our forecast with "≈". Never shown for a forecast of the typical shape alone.
 */
export default function SizeClassChip({ onOpenSection, ...input }: Props): ReactNode {
  const { t } = useTranslation()
  const size = useVehicleSize(input)
  const length = size?.figures.lengthMm
  if (!size?.cls || !length) return null

  const { cls } = size
  const approx = length.source === 'estimate' ? '≈ ' : ''
  const label = t(`size.class.${cls.cls}`)
  const title = t('size.chip.title')

  return (
    <span className="inline-flex items-center gap-0.5">
      <span className={CHIP}>
        <span aria-hidden>📏</span>
        {label}
        {cls.sub != null && ` · ${t(`rdw.size.${cls.sub}`)}`} · {approx}
        {mmToMetres(length.value)} {t('rdw.unitM')}
        <InfoPopover label={title} title={title}>
          <InfoText text={t('size.chip.info', { class: label, length: `${approx}${mmToMetres(length.value)}` })} />
          <Link
            to={readHref.sizes({
              shape: size.shape,
              cls: cls.cls,
              brand: input.brand && upperBrand(input.brand),
              model: input.model
            })}
            viewTransition
            className="mt-2 inline-block text-primary"
          >
            {t('read.card.sizeLink')} →
          </Link>
        </InfoPopover>
      </span>

      <ChipChevronButton label={t('size.chip.expand')} onClick={onOpenSection} onWarm={() => void loadSection()} />
    </span>
  )
}
