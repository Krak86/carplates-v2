import type { ReactNode } from 'react'

type Props = {
  /** Recall market code (`NL` = RDW / EU, `US` = NHTSA); anything else renders nothing. */
  market: string
  className?: string
}

const RED = '#b22234'
const BLUE = '#3c3b6e'

/**
 * Small inline SVG flag for a recall market. Emoji flags are not drawn on Windows (they show as the letters "US"), so the
 * flags are vector, work offline and need no image request. Decorative: the text next to it names the market.
 */
export default function MarketFlag({ market, className = 'h-3.5 w-5' }: Props): ReactNode {
  const base = `inline-block shrink-0 rounded-[2px] align-[-2px] ${className}`

  if (market === 'NL') {
    return (
      <svg viewBox="0 0 9 6" className={base} aria-hidden="true">
        <rect width="9" height="2" fill="#ae1c28" />
        <rect y="2" width="9" height="2" fill="#fff" />
        <rect y="4" width="9" height="2" fill="#21468b" />
      </svg>
    )
  }

  if (market === 'US') {
    return (
      <svg viewBox="0 0 19 10" className={base} aria-hidden="true">
        <rect width="19" height="10" fill="#fff" />
        {[0, 2, 4, 6, 8].map(y => (
          <rect key={y} y={y} width="19" height="1" fill={RED} />
        ))}
        <rect width="8" height="5" fill={BLUE} />
      </svg>
    )
  }

  return null
}
