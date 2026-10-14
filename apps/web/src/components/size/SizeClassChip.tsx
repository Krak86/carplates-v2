import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ChipChevronButton from '@/components/ChipChevronButton'
import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import { useVehicleSize, type VehicleSizeInput } from '@/components/size/use-vehicle-size'
import { mmToMetres } from '@/components/size/VehicleSize.helpers'

type Props = Omit<VehicleSizeInput, 'vinFields'> & {
  /** The chevron: mount the Size & parking section, open it and scroll to it. */
  onOpenSection: () => void
}

const CHIP =
  'chip-market chip-tone inline-flex animate-chip-in items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-[var(--color-fg)]'

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
      <InfoPopover
        label={title}
        title={title}
        anchor={
          <span className={CHIP}>
            <span aria-hidden>📏</span>
            {label}
            {cls.sub != null && ` · ${t(`rdw.size.${cls.sub}`)}`} · {approx}
            {mmToMetres(length.value)} {t('rdw.unitM')}
          </span>
        }
      >
        <InfoText text={t('size.chip.info', { class: label, length: `${approx}${mmToMetres(length.value)}` })} />
      </InfoPopover>

      <ChipChevronButton label={t('size.chip.expand')} onClick={onOpenSection} onWarm={() => void loadSection()} />
    </span>
  )
}
