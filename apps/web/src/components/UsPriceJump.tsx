import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ChipChevronButton from '@/components/ChipChevronButton'
import { useCardJump } from '@/components/card-jump'
import { US_PRICE_ANCHOR_ID } from '@/components/us-value.helpers'
import { scrollElementIntoView } from '@/lib/share-section'

// The Estimated value section animates open for 300 ms; scroll to the US block once it has its real height.
const OPEN_ANIMATION_MS = 400

/**
 * Chevron beside the VIN "Base Price ($)" row: goes to the US base price block. On the plate card it first opens the
 * Estimated value section (the block lives in it when an EU price exists); on the VIN page the block is already on the page.
 */
export default function UsPriceJump(): ReactNode {
  const { t } = useTranslation()
  const jump = useCardJump()

  const handleClick = (): void => {
    const scrollToBlock = (): void => {
      const el = document.getElementById(US_PRICE_ANCHOR_ID)
      if (el) scrollElementIntoView(el)
    }
    if (jump) {
      jump('value')
      window.setTimeout(scrollToBlock, OPEN_ANIMATION_MS)
    } else scrollToBlock()
  }

  return <ChipChevronButton label={t('value.us.jump')} onClick={handleClick} />
}
