import type { ReactNode } from 'react'

export type PlateSampleSpec = {
  /** The characters drawn on the plate: an illustration, never a real plate. */
  text: string
  /** Face and character colours (hex). */
  bg: string
  fg: string
  /** `ua` = blue strip with flag + UA (2015+), `old` = blue/yellow strip (2004-2015), `flag` = flag only, `none` = no strip. */
  strip: 'ua' | 'old' | 'flag' | 'none'
  /** Digits under the flag (1995-2004 plates carried the region code there). */
  code?: string
}

type Props = {
  spec: PlateSampleSpec
  label: string
}

/** A schematic plate (face colour, characters, left strip) drawn in CSS: the colour code of the plate type, not a photo of one. */
export default function PlateSample({ spec, label }: Props): ReactNode {
  const { text, bg, fg, strip, code } = spec

  return (
    <span
      role="img"
      aria-label={label}
      className="inline-flex items-stretch overflow-hidden rounded-md border-2 border-slate-700 shadow-sm select-none"
      style={{ backgroundColor: bg, color: fg }}
    >
      {strip !== 'none' && (
        <span
          aria-hidden
          className="flex w-7 flex-col items-center justify-between py-0.5 text-[9px] leading-none font-bold text-white"
          style={{ backgroundColor: strip === 'flag' ? bg : '#003399' }}
        >
          <span className="mt-0.5 flex h-3 w-4 flex-col overflow-hidden rounded-[1px]">
            <span className="flex-1 bg-[#0057b7]" />
            <span className="flex-1 bg-[#ffd700]" />
          </span>

          {strip === 'old' && <span className="block h-1 w-4 bg-[#ffd700]" />}
          {code ? <span style={{ color: strip === 'flag' ? fg : undefined }}>{code}</span> : <span>UA</span>}
        </span>
      )}

      <span
        aria-hidden
        className="px-2.5 py-0.5 font-mono text-xl leading-tight font-semibold tracking-wider whitespace-nowrap"
      >
        {text}
      </span>
    </span>
  )
}
