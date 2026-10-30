import type { ReactNode } from 'react'

type Props = {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  fontSize: number
  /** Arrow colour (the car's); the label stays in the text colour. */
  color: string
  /** Label sits beside a vertical arrow (rotated) or above a horizontal one. */
  vertical?: boolean
}

/** A dimension arrow: a line with end ticks and a centred label, in drawing millimetres. */
export default function CompareSizeDim({ x1, y1, x2, y2, label, fontSize, color, vertical = false }: Props): ReactNode {
  const tick = fontSize * 0.45
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return (
    <g>
      <g stroke={color} strokeWidth={1.6} fill="none" vectorEffect="non-scaling-stroke">
        <line x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" />
        {vertical ? (
          <>
            <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} vectorEffect="non-scaling-stroke" />
            <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <>
            <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} vectorEffect="non-scaling-stroke" />
            <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} vectorEffect="non-scaling-stroke" />
          </>
        )}
      </g>
      {vertical ? (
        <text
          x={mx - fontSize * 0.7}
          y={my}
          fontSize={fontSize}
          textAnchor="middle"
          fill="var(--color-fg)"
          transform={`rotate(-90 ${mx - fontSize * 0.7} ${my})`}
        >
          {label}
        </text>
      ) : (
        <text x={mx} y={my - fontSize * 0.45} fontSize={fontSize} textAnchor="middle" fill="var(--color-fg)">
          {label}
        </text>
      )}
    </g>
  )
}
