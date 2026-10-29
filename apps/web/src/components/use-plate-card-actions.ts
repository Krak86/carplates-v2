import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { downloadBlob, toFileStem } from '@/lib/download'
import { statsTopQuery } from '@/lib/queries'
import { renderPlateCardPng } from '@/lib/plate-card'
import type { PlateCardInput } from '@/lib/plate-card'
import { rankingBadges } from '@/routes/stats/helpers'

type Props = Omit<PlateCardInput, 'fact'> & {
  color: string | null
  kind: string | null
}

type UsePlateCardActions = {
  busy: boolean
  failed: boolean
  save: () => Promise<void>
}

/** Builds the plate card PNG on demand: native share sheet with the file where supported, else a download. */
export function usePlateCardActions({ color, kind, ...card }: Props): UsePlateCardActions {
  const { t } = useTranslation()
  const stats = useQuery(statsTopQuery())
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const save = async (): Promise<void> => {
    setBusy(true)
    setFailed(false)
    try {
      const badge = stats.data
        ? rankingBadges(stats.data, { brand: card.brand, model: card.model, color, region: card.region, kind })[0]
        : undefined
      const blob = await renderPlateCardPng({ ...card, fact: badge ? t(badge.textKey, { rank: badge.rank }) : null })
      if (!blob) {
        setFailed(true)
        return
      }
      const filename = `${toFileStem(card.plate)}.png`
      const file = new File([blob], filename, { type: 'image/png' })
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: card.plate })
          return
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
        }
      }
      downloadBlob(blob, filename)
    } finally {
      setBusy(false)
    }
  }

  return { busy, failed, save }
}
