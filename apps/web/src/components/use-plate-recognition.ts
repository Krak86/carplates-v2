import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import type { PhotoMeta, PlateCandidate } from '@carplates/shared'

import { ApiError, recognizePlate, recognizeVin } from '@/lib/api'
import { shrinkImage } from '@/lib/image'
import { readPhotoMeta } from '@/lib/photo-meta'
import { readVinBarcode } from '@/lib/vin-barcode'

const DISMISS_REVOKE_MS = 600

export type PhotoThumbnail = {
  url: string
  /** Plate/VIN values this photo is considered relevant to — the recognized plate, plus any linked VIN/plate discovered while viewing a connected page. */
  connected: Set<string>
  /** All plate reads for this photo, best first — the first one is what we navigated to. */
  candidates: PlateCandidate[]
  /** EXIF capture date/GPS from the original file, when it had any. */
  meta: PhotoMeta | null
  /** What the photo was submitted for: VIN photos skip the date/GPS info and plate-specific warnings. */
  mode: 'plate' | 'vin'
  /** True once the recognize request has succeeded or failed (vs. still in flight). */
  settled: boolean
}

type UsePlateRecognitionParams = {
  /** The plate/VIN currently shown by the route, or null when there isn't one. */
  currentValue: string | null
  /** The counterpart value discovered from the current page's data (a plate's linked VIN, or a VIN's linked plate), once known. */
  linkedValue: string | null
}

type UsePlateRecognition = {
  recognize: (file: File) => void
  recognizeVin: (file: File) => void
  isPending: boolean
  errorKey: string | null
  photo: PhotoThumbnail | null
  dismissPhoto: () => void
  selectCandidate: (plate: string) => void
}

type Job = { file: File; mode: 'plate' | 'vin' }
type Reads = { values: string[]; candidates: PlateCandidate[] }

/** A VIN barcode is read on-device when the browser can; otherwise the photo goes to the server OCR. */
async function readVin(file: File): Promise<Reads> {
  const barcode = await readVinBarcode(file)
  if (barcode) return { values: [barcode], candidates: [] }
  const res = await recognizeVin(await shrinkImage(file))
  // VIN reads reuse the plate-candidate shape (key = the VIN), so the photo outlines and the "also found" chips just work.
  const candidates: PlateCandidate[] = res.candidates.map(c => ({
    plate: c.vin,
    raw: c.vin,
    score: c.score,
    ...(c.box ? { box: c.box } : {})
  }))
  return { values: candidates.map(c => c.plate), candidates }
}

async function readPlate(file: File): Promise<Reads> {
  const res = await recognizePlate(await shrinkImage(file))
  return { values: res.candidates.map(c => c.plate), candidates: res.candidates }
}

function errorKeyFor(error: Error | null, mode: Job['mode']): string | null {
  if (!error) return null
  if (!(error instanceof ApiError)) return 'recognize.error'
  switch (error.status) {
    case 404:
      return mode === 'vin' ? 'recognize.noVin' : 'recognize.noPlate'
    case 400:
      return 'recognize.badImage'
    case 413:
      return 'recognize.tooLarge'
    case 429:
      return 'recognize.rateLimited'
    case 503:
      return 'recognize.unavailable'
    default:
      return 'recognize.error'
  }
}

export function usePlateRecognition({ currentValue, linkedValue }: UsePlateRecognitionParams): UsePlateRecognition {
  const navigate = useNavigate()
  const [photo, setPhoto] = useState<PhotoThumbnail | null>(null)
  const photoRef = useRef(photo)
  photoRef.current = photo

  const { mutate, reset, isPending, error, variables } = useMutation({
    mutationFn: async ({ file, mode }: Job) => (mode === 'vin' ? readVin(file) : readPlate(file)),
    onSuccess: data => {
      const top = data.values[0]
      if (!top) return
      setPhoto(prev =>
        prev
          ? {
              ...prev,
              connected: new Set([...prev.connected, ...data.values]),
              candidates: data.candidates,
              settled: true
            }
          : prev
      )
      void navigate(`/${encodeURIComponent(top)}`, { viewTransition: true })
    },
    onError: () => {
      setPhoto(prev => (prev ? { ...prev, settled: true } : prev))
    }
  })

  const start = (file: File, mode: Job['mode']): void => {
    // Drop the previous result and input: the route goes back to idle until the new photo resolves.
    void navigate('/', { viewTransition: true })
    setPhoto(prev => {
      if (prev) URL.revokeObjectURL(prev.url)
      return { url: URL.createObjectURL(file), connected: new Set(), candidates: [], meta: null, mode, settled: false }
    })
    if (mode === 'plate') void readPhotoMeta(file).then(meta => setPhoto(prev => (prev ? { ...prev, meta } : prev)))
    mutate({ file, mode })
  }

  const recognize = (file: File): void => start(file, 'plate')
  const recognizeVinPhoto = (file: File): void => start(file, 'vin')

  const selectCandidate = (plate: string): void => {
    void navigate(`/${encodeURIComponent(plate)}`, { viewTransition: true })
  }

  const dismissPhoto = (): void => {
    // Stay on the current route; the URL is revoked after the fade-out so the image doesn't vanish mid-animation.
    const url = photoRef.current?.url
    if (url) setTimeout(() => URL.revokeObjectURL(url), DISMISS_REVOKE_MS)
    setPhoto(null)
    reset()
  }

  // Keeps the thumbnail only while the current page is (or becomes, via a
  // discovered plate<->VIN link) part of the set this photo is connected to;
  // clears it (and the stale error message with it) once settled and the
  // route navigates somewhere unconnected.
  useEffect(() => {
    setPhoto(prev => {
      if (!prev) return prev
      const isConnected = currentValue != null && prev.connected.has(currentValue)
      if (isConnected) {
        if (linkedValue && !prev.connected.has(linkedValue)) {
          return { ...prev, connected: new Set(prev.connected).add(linkedValue) }
        }
        return prev
      }
      if (prev.settled) {
        URL.revokeObjectURL(prev.url)
        reset()
        return null
      }
      return prev
    })
  }, [currentValue, linkedValue, reset])

  useEffect(() => {
    return (): void => {
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.url)
    }
  }, [])

  return {
    recognize,
    recognizeVin: recognizeVinPhoto,
    isPending,
    errorKey: errorKeyFor(error, variables?.mode ?? 'plate'),
    photo,
    dismissPhoto,
    selectCandidate
  }
}
