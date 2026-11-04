import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

import { showroomDetailQuery } from '@/lib/queries'
import type { OpenView } from '@/routes/showroom/helpers'

const Model360Modal = lazy(() => import('@/components/Model360Modal'))
const Model3dModal = lazy(() => import('@/components/Model3dModal'))
const ShowroomTuningModal = lazy(() => import('@/routes/showroom/ShowroomTuningModal'))
const ShowroomOemModal = lazy(() => import('@/routes/showroom/ShowroomOemModal'))

type Props = {
  open: OpenView
  onClose: () => void
}

/**
 * Loads what one showroom entry opens, then shows it in the same modal the car card uses (360 and 3D embed their
 * provider's own viewer; 3DTuning is a list of link-outs). Mounted only after a click, so the page never contacts a
 * provider's viewer on its own. Nothing is shown while loading or when the entry has none of the asked kind.
 */
export default function ShowroomViewer({ open, onClose }: Props): ReactNode {
  const { brandSlug, modelSlug, kind } = open
  const { data } = useQuery(showroomDetailQuery(brandSlug, modelSlug))
  if (!data) return null

  return (
    <Suspense fallback={null}>
      {kind === '360' && (data.models360.length > 0 || data.winner.length > 0) && (
        <Model360Modal models={data.models360} winner={data.winner} label={data.label} hideShare onClose={onClose} />
      )}
      {kind === '3d' && data.models3d.length > 0 && (
        <Model3dModal models={data.models3d} label={data.label} hideShare onClose={onClose} />
      )}
      {kind === 'tuning' && data.tuning.length > 0 && (
        <ShowroomTuningModal label={data.label} pages={data.tuning} onClose={onClose} />
      )}
      {kind === 'oem' && data.oem.length > 0 && (
        <ShowroomOemModal label={data.label} links={data.oem} onClose={onClose} />
      )}
    </Suspense>
  )
}
