import type { ReactNode } from 'react'

import { commonsThumbUrl } from '@carplates/shared'

type Props = {
  url: string
  onError?: () => void
}

/** A photo-strip thumbnail: a small rendition (not the 1280 px hero file), lazy and low priority. */
export default function StripThumb({ url, onError }: Props): ReactNode {
  return (
    <img
      src={commonsThumbUrl(url)}
      alt=""
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      onError={onError}
      className="h-full w-full object-cover"
    />
  )
}
