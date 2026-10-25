import type { ReactNode } from 'react'

import { regionFlagUrl } from '@/lib/region-flags'

type Props = {
  /** Region name as in the registry (`REGIONS`); nothing renders for a region without a flag. */
  region: string | null | undefined
}

/** A region's flag as a small decorative image: the region name always sits beside it, so it has no alt text. */
export default function RegionFlag({ region }: Props): ReactNode {
  const src = regionFlagUrl(region)
  if (!src) return null

  return (
    <img
      src={src}
      alt=""
      width={18}
      height={12}
      loading="lazy"
      draggable={false}
      className="inline-block h-3 w-[18px] shrink-0 rounded-[2px] object-cover align-middle shadow-[0_0_0_1px_rgb(0_0_0/0.15)]"
    />
  )
}
