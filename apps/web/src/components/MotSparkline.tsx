import { useState } from 'react'
import type { ReactNode } from 'react'

import { gapPath, slotOf } from '@/components/MotChart.helpers'
import { niceMax, type MotMode } from '@/components/MotFaults.helpers'
import { cn } from '@/lib/cn'

type Series = readonly (number | null)[]

type Props = {
  fail: Series
  watch: Series
  /** The same share for every model of this kind (UK average), per band — a thin neutral line. */
  baselineFail?: Series | null
  baselineWatch?: Series | null
  mode: MotMode
  active: number | null
  onActive: (band: number | null) => void
  ariaLabel: string
  /** Gentle periodic pulse that tells the viewer the chart reacts to hover / tap (off once they have used one). */
  nudge?: boolean
}

const BOX = { width: 168, height: 48, left: 4, right: 4, top: 6, bottom: 6 }
const MARKER_RADIUS = 4

/**
 * A small multiple: one issue's share of tests per mileage band — fails solid orange, "watch for" dashed blue, the UK
 * average a thin neutral line. Own y scale (the row prints the peak), a gap where a band has too few tests. Shares the
 * active band with the other charts; the hit areas are whole band columns.
 */
export default function MotSparkline({
  fail,
  watch,
  baselineFail,
  baselineWatch,
  mode,
  active,
  onActive,
  ariaLabel,
  nudge = false
}: Props): ReactNode {
  // Random start per chart so the pulses ripple down the list instead of beating in unison.
  const [delay] = useState(() => Math.random() * 6)
  const showFail = mode !== 'watch'
  const showWatch = mode !== 'fail'
  const n = fail.length
  const plotBottom = BOX.height - BOX.bottom

  const drawn: Series[] = [
    ...(showFail ? [fail, baselineFail ?? []] : []),
    ...(showWatch ? [watch, baselineWatch ?? []] : [])
  ]
  const max = Math.max(0, ...drawn.flat().filter((v): v is number => v != null))
  const top = niceMax(max)
  const yOf = (v: number): number => plotBottom - (v / top) * (plotBottom - BOX.top)
  const points = (s: Series): { x: number; y: number | null }[] =>
    s.map((v, i) => ({ x: slotOf(i, n, BOX.left, BOX.width - BOX.right).center, y: v == null ? null : yOf(v) }))

  return (
    <svg
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      role="img"
      aria-label={ariaLabel}
      style={nudge ? { animationDelay: `${delay}s` } : undefined}
      className={cn('h-12 w-full max-w-[168px] shrink-0 touch-manipulation', nudge && 'animate-mot-nudge')}
    >
      <line
        x1={BOX.left}
        x2={BOX.width - BOX.right}
        y1={plotBottom}
        y2={plotBottom}
        stroke="var(--color-border)"
        strokeWidth={1}
      />

      {active != null && active < n && (
        <rect
          x={slotOf(active, n, BOX.left, BOX.width - BOX.right).x}
          y={0}
          width={slotOf(active, n, BOX.left, BOX.width - BOX.right).width}
          height={BOX.height}
          fill="var(--color-primary)"
          opacity={0.12}
        />
      )}

      {showFail && baselineFail && (
        <path d={gapPath(points(baselineFail))} fill="none" stroke="var(--color-muted)" strokeWidth={1} opacity={0.8} />
      )}
      {showWatch && !showFail && baselineWatch && (
        <path
          d={gapPath(points(baselineWatch))}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={1}
          opacity={0.8}
        />
      )}

      {showFail && (
        <path
          d={gapPath(points(fail))}
          fill="none"
          stroke="var(--color-mot-fail)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {showWatch && (
        <path
          d={gapPath(points(watch))}
          fill="none"
          stroke="var(--color-mot-watch)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 3"
        />
      )}

      {active != null && showFail && fail[active] != null && (
        <circle
          cx={slotOf(active, n, BOX.left, BOX.width - BOX.right).center}
          cy={yOf(fail[active]!)}
          r={MARKER_RADIUS}
          fill="var(--color-mot-fail)"
          stroke="var(--color-bg)"
          strokeWidth={2}
        />
      )}
      {active != null && showWatch && watch[active] != null && (
        <circle
          cx={slotOf(active, n, BOX.left, BOX.width - BOX.right).center}
          cy={yOf(watch[active]!)}
          r={MARKER_RADIUS}
          fill="var(--color-mot-watch)"
          stroke="var(--color-bg)"
          strokeWidth={2}
        />
      )}

      {Array.from({ length: n }, (_, i) => {
        const slot = slotOf(i, n, BOX.left, BOX.width - BOX.right)
        return (
          <rect
            key={i}
            x={slot.x}
            y={0}
            width={slot.width}
            height={BOX.height}
            fill="transparent"
            className="cursor-pointer"
            onPointerEnter={e => {
              if (e.pointerType === 'mouse') onActive(i)
            }}
            onPointerLeave={e => {
              if (e.pointerType === 'mouse') onActive(null)
            }}
            onClick={() => onActive(active === i ? null : i)}
          />
        )
      })}
    </svg>
  )
}
