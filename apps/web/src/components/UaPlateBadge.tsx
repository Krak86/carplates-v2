import type { ReactNode } from 'react'

type Props = {
  plate: string
  className?: string
}

const SPLIT_RE = /^([^\d]{2})(\d{4})([^\d]{2})$/

/** Groups a standard `AA1234AA` plate as `AA 1234 AA`; any other shape is shown as-is. */
function formatPlate(plate: string): string {
  const m = SPLIT_RE.exec(plate)
  return m ? `${m[1]} ${m[2]} ${m[3]}` : plate
}

/** The plate drawn like a Ukrainian number plate: white face, blue EU-style strip with flag + "UA". */
export default function UaPlateBadge({ plate, className = '' }: Props): ReactNode {
  return (
    <span
      className={`inline-flex items-stretch overflow-hidden rounded-md border-2 border-slate-700 bg-white align-middle shadow-sm ${className}`}
    >
      <span
        aria-hidden
        className="flex w-7 flex-col items-center justify-between bg-[#003399] py-0.5 text-[9px] leading-none font-bold text-white"
      >
        <span className="mt-0.5 flex h-3 w-4 flex-col overflow-hidden rounded-[1px]">
          <span className="flex-1 bg-[#0057b7]" />
          <span className="flex-1 bg-[#ffd700]" />
        </span>
        <span>UA</span>
      </span>

      <span className="px-2.5 py-0.5 font-mono text-xl leading-tight font-semibold tracking-wider whitespace-nowrap text-slate-900">
        {formatPlate(plate)}
      </span>
    </span>
  )
}
