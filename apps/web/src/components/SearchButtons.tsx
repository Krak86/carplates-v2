import type { ReactNode } from 'react'

import ArSearchButton from '@/components/ArSearchButton'
import CameraSearchButton from '@/components/CameraSearchButton'
import PhotoSearchButton from '@/components/PhotoSearchButton'
import VinSearchButton from '@/components/VinSearchButton'

type Props = {
  isRecognizing: boolean
  online: boolean
  onPickPhoto: (file: File) => void
  onPickVinPhoto: (file: File) => void
}

/** The photo / camera / AR / VIN-photo row — split out of `SearchField` so it loads after first paint (idle). */
export default function SearchButtons({ isRecognizing, online, onPickPhoto, onPickVinPhoto }: Props): ReactNode {
  return (
    <>
      <PhotoSearchButton isPending={isRecognizing} disabled={!online} onPick={onPickPhoto} />
      <CameraSearchButton isPending={isRecognizing} disabled={!online} onCapture={onPickPhoto} />
      <ArSearchButton disabled={!online} />
      <VinSearchButton isPending={isRecognizing} disabled={!online} onPick={onPickVinPhoto} />
    </>
  )
}
