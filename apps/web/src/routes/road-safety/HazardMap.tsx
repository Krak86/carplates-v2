import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { RoadSafetyHazardsResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { kmLabel, streetViewUrl } from '@/routes/road-safety/helpers'

type Props = {
  hazards: RoadSafetyHazardsResponse['hazards']
  /** The visitor's position ("near me"), drawn as a blue dot. */
  me?: { lat: number; lon: number } | null
}

const COLOR = '#dc2626'
const KYIV: [number, number] = [49, 31.5]

/** One popup, built from DOM nodes (never HTML strings: road names come from a file). */
function popupNode(
  h: Props['hazards'][number],
  labels: { bypass: string; crashes: string; street: string }
): HTMLElement {
  const box = document.createElement('div')
  const title = document.createElement('strong')
  title.textContent = h.roadCode || labels.bypass
  box.append(title, document.createElement('br'), h.roadName)

  if (h.kmStart !== null) {
    box.append(
      document.createElement('br'),
      `km ${kmLabel(h.kmStart)}${h.kmEnd !== null && h.kmEnd !== h.kmStart ? ` - ${kmLabel(h.kmEnd)}` : ''}`
    )
  }

  if (h.crashes3y !== null) box.append(document.createElement('br'), labels.crashes)

  if (h.lat !== null && h.lon !== null) {
    const link = document.createElement('a')
    link.href = streetViewUrl(h.lat, h.lon)
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = labels.street
    box.append(document.createElement('br'), link)
  }

  return box
}

/**
 * Hazard places on a real OpenStreetMap basemap (Leaflet, loaded on demand so it stays out of every other chunk): a dot per
 * place sized by its crashes, the whole segment as a line when the source gave both ends, a Street View link in each popup.
 */
export default function HazardMap({ hazards, me }: Props): ReactNode {
  const { t } = useTranslation()
  const el = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = el.current
    if (!node) return
    let dispose = () => {}
    let cancelled = false

    void (async () => {
      const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
      if (cancelled) return

      const map = L.map(node, { scrollWheelZoom: false }).setView(KYIV, 6)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map)

      const bounds: [number, number][] = []
      for (const h of hazards) {
        if (h.lat === null || h.lon === null) continue
        bounds.push([h.lat, h.lon])
        const popup = () =>
          popupNode(h, {
            bypass: t('roadSafety.hazards.bypass'),
            crashes: t('roadSafety.hazards.crashes3y', { count: h.crashes3y ?? 0 }),
            street: t('roadSafety.hazards.streetView')
          })

        if (h.latEnd != null && h.lonEnd != null && (h.latEnd !== h.lat || h.lonEnd !== h.lon)) {
          L.polyline(
            [
              [h.lat, h.lon],
              [h.latEnd, h.lonEnd]
            ],
            { color: COLOR, weight: 5, opacity: 0.8 }
          )
            .bindPopup(popup)
            .addTo(map)
        }

        L.circleMarker([h.lat, h.lon], {
          radius: Math.min(11, 4 + Math.sqrt(h.crashes3y ?? 0) / 2),
          color: '#fff',
          weight: 1,
          fillColor: COLOR,
          fillOpacity: 0.75
        })
          .bindPopup(popup)
          .addTo(map)
      }

      if (me) {
        L.circleMarker([me.lat, me.lon], {
          radius: 8,
          color: '#fff',
          weight: 2,
          fillColor: '#2563eb',
          fillOpacity: 1
        }).addTo(map)
        bounds.push([me.lat, me.lon])
      }

      if (bounds.length > 0) map.fitBounds(bounds, { padding: [24, 24], maxZoom: me ? 11 : 12 })
      dispose = () => map.remove()
    })()

    return () => {
      cancelled = true
      dispose()
    }
  }, [hazards, me, t])

  return (
    <div className="mb-3">
      <div
        ref={el}
        role="region"
        aria-label={t('roadSafety.hazards.mapLabel')}
        className="z-0 h-[420px] w-full overflow-hidden rounded-md border border-[var(--color-border)]"
      />

      <p className="mt-1 text-xs text-[var(--color-muted)]">
        {t('roadSafety.hazards.mapCount', { count: hazards.filter(h => h.lat !== null && h.lon !== null).length })}
      </p>
    </div>
  )
}
