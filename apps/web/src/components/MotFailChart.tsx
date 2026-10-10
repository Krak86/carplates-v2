import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MotBand } from '@carplates/shared'

import { bandLabel, formatShare, formatTests, niceMax, type MotMode } from '@/components/MotFaults.helpers'
import { barPath, gapPath, slotOf } from '@/components/MotChart.helpers'

type Props = {
  bands: readonly MotBand[]
  edgesKm: readonly number[]
  mode: MotMode
  /** Highlighted band, shared with every other chart of the section. */
  active: number | null
  onActive: (band: number | null) => void
}

const BOX = { width: 360, height: 190, left: 34, right: 8, top: 12, bottom: 34 }
const BAR_MAX_WIDTH = 24
const MARKER_RADIUS = 4

/**
 * "Fail rate by mileage": one column per mileage band = share of normal tests that failed (solid orange), a dashed blue
 * line = share of tests with at least one advisory ("watch for"), a short grey tick = the same fail rate for every model of
 * this kind (the UK average). A band with too few tests is a gap with a dash, never a zero. Tapping or hovering a band
 * highlights it here and in every other chart; the readout under the chart (and the table) carry every value.
 */
export default function MotFailChart({ bands, edgesKm, mode, active, onActive }: Props): ReactNode {
  const { t } = useTranslation()
  const showFail = mode !== 'watch'
  const showWatch = mode !== 'fail'
  const n = bands.length
  const plotBottom = BOX.height - BOX.bottom
  const plotHeight = plotBottom - BOX.top

  const shown = bands.flatMap(b => [
    showFail ? b.failRate : null,
    showFail ? b.baselineFailRate : null,
    showWatch ? b.watchRate : null
  ])
  const top = niceMax(Math.max(0, ...shown.filter((v): v is number => v != null)))
  const yOf = (v: number): number => plotBottom - (v / top) * plotHeight
  const ticks = [0, top / 2, top]

  const watchPoints = bands.map((b, i) => ({
    x: slotOf(i, n, BOX.left, BOX.width - BOX.right).center,
    y: b.watchRate == null ? null : yOf(b.watchRate)
  }))

  return (
    <svg
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      role="img"
      aria-label={t('mot.chart.fail.aria')}
      className="h-auto w-full touch-manipulation"
    >
      <g fontSize={10} fill="var(--color-muted)">
        {ticks.map(v => (
          <g key={v}>
            <line
              x1={BOX.left}
              x2={BOX.width - BOX.right}
              y1={yOf(v)}
              y2={yOf(v)}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text x={BOX.left - 5} y={yOf(v) + 3.5} textAnchor="end">
              {Math.round(v * 100)} %
            </text>
          </g>
        ))}
      </g>

      {bands.map((b, i) => {
        const slot = slotOf(i, n, BOX.left, BOX.width - BOX.right)
        const width = Math.min(BAR_MAX_WIDTH, slot.width * 0.6)
        const isActive = active === i
        return (
          <g key={i}>
            {isActive && (
              <rect
                x={slot.x}
                y={BOX.top - 4}
                width={slot.width}
                height={plotHeight + 4}
                rx={4}
                fill="var(--color-primary)"
                opacity={0.1}
              />
            )}

            {showFail && b.failRate != null && (
              <path
                d={barPath(slot.center - width / 2, width, yOf(b.failRate), plotBottom)}
                fill="var(--color-mot-fail)"
                opacity={active != null && !isActive ? 0.55 : 1}
              />
            )}

            {showFail && b.baselineFailRate != null && (
              <line
                x1={slot.center - width / 2 - 3}
                x2={slot.center + width / 2 + 3}
                y1={yOf(b.baselineFailRate)}
                y2={yOf(b.baselineFailRate)}
                stroke="var(--color-fg)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            )}

            {b.failRate == null && b.watchRate == null && (
              <text x={slot.center} y={plotBottom - 5} textAnchor="middle" fontSize={10} fill="var(--color-muted)">
                –
              </text>
            )}

            <text
              x={slot.center}
              y={plotBottom + 14}
              textAnchor="middle"
              fontSize={9.5}
              fill={isActive ? 'var(--color-fg)' : 'var(--color-muted)'}
              fontWeight={isActive ? 600 : 400}
            >
              {bandLabel(edgesKm, i)}
            </text>
          </g>
        )
      })}

      {showWatch && (
        <>
          <path
            d={gapPath(watchPoints)}
            fill="none"
            stroke="var(--color-mot-watch)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5 4"
          />
          {watchPoints.map(
            (p, i) =>
              p.y != null && (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={MARKER_RADIUS}
                  fill="var(--color-mot-watch)"
                  stroke="var(--color-bg)"
                  strokeWidth={2}
                />
              )
          )}
        </>
      )}

      <text
        x={(BOX.left + BOX.width - BOX.right) / 2}
        y={BOX.height - 3}
        textAnchor="middle"
        fontSize={10}
        fill="var(--color-muted)"
      >
        {t('mot.axis.km')}
      </text>

      {/* Hit areas: the whole band column, far larger than any mark. */}
      {bands.map((b, i) => {
        const slot = slotOf(i, n, BOX.left, BOX.width - BOX.right)
        const label = `${bandLabel(edgesKm, i)} ${t('mot.axis.km')}: ${t('mot.readout.tests', { count: formatTests(b.tests) })}, ${t('mot.fail')} ${formatShare(b.failRate)}, ${t('mot.watch')} ${formatShare(b.watchRate)}`
        return (
          <rect
            key={i}
            x={slot.x}
            y={0}
            width={slot.width}
            height={BOX.height}
            fill="transparent"
            tabIndex={0}
            role="button"
            aria-label={label}
            aria-pressed={active === i}
            className="cursor-pointer outline-none focus-visible:stroke-[var(--color-primary)] focus-visible:stroke-2"
            onPointerEnter={e => {
              if (e.pointerType === 'mouse') onActive(i)
            }}
            onPointerLeave={e => {
              if (e.pointerType === 'mouse') onActive(null)
            }}
            onClick={() => onActive(active === i ? null : i)}
            onFocus={() => onActive(i)}
            onBlur={() => onActive(null)}
          />
        )
      })}
    </svg>
  )
}
