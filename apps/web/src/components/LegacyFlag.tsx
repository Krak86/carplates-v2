import type { ReactNode } from 'react'

import type { LegacyCountry } from '@carplates/shared'

type Props = {
  code: LegacyCountry
  className?: string
}

const GOLD = '#ffd700'

/** Five-point star polygon centred on (cx, cy). */
function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI / 5) * i - Math.PI / 2
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

/**
 * Hand-drawn SVG flags for states that no longer exist (flag-icons has none of them), simplified to read at 20 px.
 * West Germany flies the German flag, so `DE-FRG` is drawn by `Flag` from the regular file instead.
 */
export default function LegacyFlag({ code, className = 'h-3.5 w-5' }: Props): ReactNode {
  const base = `inline-block shrink-0 rounded-xs align-[-2px] ${className}`

  if (code === 'SU') {
    return (
      <svg viewBox="0 0 640 480" className={base} aria-hidden="true">
        <rect width="640" height="480" fill="#cc0000" />
        <polygon points={starPoints(130, 100, 56, 22)} fill={GOLD} />
        <path d="M150 260a85 85 0 1 1-70 110 62 62 0 1 0 70-110z" fill={GOLD} />
        <rect x="95" y="330" width="130" height="26" rx="4" transform="rotate(-35 160 343)" fill={GOLD} />
        <rect x="190" y="250" width="56" height="34" rx="4" transform="rotate(-35 218 267)" fill={GOLD} />
      </svg>
    )
  }

  if (code === 'CSHH') {
    return (
      <svg viewBox="0 0 640 480" className={base} aria-hidden="true">
        <rect width="640" height="240" fill="#fff" />
        <rect y="240" width="640" height="240" fill="#d7141a" />
        <polygon points="0,0 320,240 0,480" fill="#11457e" />
      </svg>
    )
  }

  if (code === 'DD') {
    return (
      <svg viewBox="0 0 640 480" className={base} aria-hidden="true">
        <rect width="640" height="160" fill="#000" />
        <rect y="160" width="640" height="160" fill="#dd0000" />
        <rect y="320" width="640" height="160" fill={GOLD} />
        <circle cx="320" cy="240" r="84" fill="none" stroke={GOLD} strokeWidth="26" />
        <rect x="302" y="170" width="36" height="140" fill="#000" />
        <rect x="270" y="170" width="100" height="40" fill="#000" />
        <path d="M262 316L320 190L378 316" fill="none" stroke="#000" strokeWidth="14" />
      </svg>
    )
  }

  if (code === 'YU' || code === 'CSXX') {
    return (
      <svg viewBox="0 0 640 480" className={base} aria-hidden="true">
        <rect width="640" height="160" fill="#0c4076" />
        <rect y="160" width="640" height="160" fill="#fff" />
        <rect y="320" width="640" height="160" fill="#c6363c" />
        {code === 'YU' && (
          <polygon points={starPoints(320, 240, 70, 28)} fill="#c6363c" stroke={GOLD} strokeWidth="10" />
        )}
      </svg>
    )
  }

  return null
}
