import type { ReactNode } from 'react'

import type { ExportFormat } from '@/lib/export-report'

type Props = { format: ExportFormat }

const EMOJI: Readonly<Record<Exclude<ExportFormat, 'docx' | 'pdf'>, string>> = {
  clipboard: '📋',
  txt: '📄',
  md: '📝',
  csv: '📊'
}

/** Small menu icon per export format: emoji for generic ones, Word/PDF-style SVG badges for docx/pdf. */
export default function ExportFormatIcon({ format }: Props): ReactNode {
  if (format === 'docx') {
    return (
      <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0">
        <rect x="1" y="1" width="14" height="14" rx="2" fill="#2b579a" />
        <path d="M3.6 5.2l1.2 5.6h.9L8 7.3l2.3 3.5h.9l1.2-5.6h-1l-.7 3.6-2.1-3.3h-.8L5.2 8.8l-.7-3.6z" fill="#fff" />
      </svg>
    )
  }
  if (format === 'pdf') {
    return (
      <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0">
        <path d="M3 1h6.5L13 4.5V15H3z" fill="#e2231a" />
        <path d="M9.5 1v3.5H13z" fill="#fff" fillOpacity=".45" />
        <path
          d="M5 11.5c1.6-.9 2.700-2.700 3.100-4.600.2-.9-.9-.9-.8.100.2 1.500 1.500 3 3.200 3.300.9.100.8-.8-.1-.8-1.700.1-3.700.4-5.400 2z"
          fill="none"
          stroke="#fff"
          strokeWidth=".9"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <span aria-hidden className="inline-block w-4 shrink-0 text-center text-sm leading-none">
      {EMOJI[format]}
    </span>
  )
}
