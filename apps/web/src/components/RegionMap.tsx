import type { ReactNode } from 'react'

import { regionMapUrl } from '@/lib/region-centers'

type Props = { region: string }

export default function RegionMap({ region }: Props): ReactNode {
  const src = regionMapUrl(region)
  if (!src) return null

  return (
    <iframe
      key={region}
      src={src}
      title={region}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="mt-3 h-64 w-full rounded-lg border border-[var(--color-border)]"
    />
  )
}
