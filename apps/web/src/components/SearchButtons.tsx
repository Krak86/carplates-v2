import type { ReactNode } from 'react'
import type { ShareAlias } from '@carplates/shared'

import ArSearchButton from '@/components/ArSearchButton'
import CameraSearchButton from '@/components/CameraSearchButton'
import PhotoSearchButton from '@/components/PhotoSearchButton'
import VinSearchButton from '@/components/VinSearchButton'

type Props = {
  isRecognizing: boolean
  online: boolean
  /** The entry a share link points at: its button pulses. */
  focus: ShareAlias | null
  onPickPhoto: (file: File) => void
  onPickVinPhoto: (file: File) => void
}

/** The photo / camera / AR / VIN-photo row — split out of `SearchField` so it loads after first paint (idle). */
export default function SearchButtons({ isRecognizing, online, focus, onPickPhoto, onPickVinPhoto }: Props): ReactNode {
  return (
    <>
      <PhotoSearchButton
        isPending={isRecognizing}
        disabled={!online}
        highlight={focus === 'plate-photo'}
        onPick={onPickPhoto}
      />
      <CameraSearchButton isPending={isRecognizing} disabled={!online} onCapture={onPickPhoto} />
      <ArSearchButton isPending={isRecognizing} disabled={!online} highlight={focus === 'ar'} />
      <VinSearchButton
        isPending={isRecognizing}
        disabled={!online}
        highlight={focus === 'vin-photo'}
        onPick={onPickVinPhoto}
      />
    </>
  )
}
