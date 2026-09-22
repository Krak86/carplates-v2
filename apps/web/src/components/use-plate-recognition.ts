import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { ApiError, recognizePlate } from '@/lib/api'
import { shrinkImage } from '@/lib/image'

export type PhotoThumbnail = {
  url: string
  /** Plate/VIN values this photo is considered relevant to — the recognized plate, plus any linked VIN/plate discovered while viewing a connected page. */
  connected: Set<string>
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
  isPending: boolean
  errorKey: string | null
  photo: PhotoThumbnail | null
  dismissPhoto: () => void
}

function errorKeyFor(error: Error | null): string | null {
  if (!error) return null
  if (!(error instanceof ApiError)) return 'recognize.error'
  switch (error.status) {
    case 404:
      return 'recognize.noPlate'
    case 400:
      return 'recognize.badImage'
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

  const { mutate, reset, isPending, error } = useMutation({
    mutationFn: async (file: File) => recognizePlate(await shrinkImage(file)),
    onSuccess: data => {
      const top = data.candidates[0]
      if (!top) return
      setPhoto(prev => (prev ? { ...prev, connected: new Set(prev.connected).add(top.plate), settled: true } : prev))
      void navigate(`/${encodeURIComponent(top.plate)}`)
    },
    onError: () => {
      setPhoto(prev => (prev ? { ...prev, settled: true } : prev))
    }
  })

  const recognize = (file: File): void => {
    setPhoto(prev => {
      if (prev) URL.revokeObjectURL(prev.url)
      return { url: URL.createObjectURL(file), connected: new Set(), settled: false }
    })
    mutate(file)
  }

  const dismissPhoto = (): void => {
    setPhoto(prev => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
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

  return { recognize, isPending, errorKey: errorKeyFor(error), photo, dismissPhoto }
}
