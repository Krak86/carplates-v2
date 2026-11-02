import type { ReactNode } from 'react'
import { encode } from 'uqr'

type Props = {
  url: string
  label: string
}

const QUIET_ZONE = 2

/** QR of a link as inline SVG (no `data:` image, CSP-safe). Always dark on white: scanners need the contrast in either theme. */
export default function ShareQr({ url, label }: Props): ReactNode {
  const { data, size } = encode(url, { ecc: 'M', border: 0 })
  const side = size + QUIET_ZONE * 2
  const path = data
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z` : '')))
    .join('')

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${side} ${side}`}
      shapeRendering="crispEdges"
      className="h-44 w-44 rounded bg-white"
    >
      <path d={path} fill="#000" />
    </svg>
  )
}
