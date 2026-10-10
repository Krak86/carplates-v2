import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { MotIssue } from '@carplates/shared'

import MotSparkline from '@/components/MotSparkline'
import { bandLabel, formatShare, peakOf, trendOf, type MotMode } from '@/components/MotFaults.helpers'
import { cn } from '@/lib/cn'

type Props = {
  /** Translated name; the original DVSA wording goes in `original`. */
  label: string
  /** DVSA's English wording, shown small under a translated name (and as the name itself when nothing is translated). */
  original?: string
  issue: MotIssue
  edgesKm: readonly number[]
  mode: MotMode
  active: number | null
  onActive: (band: number | null) => void
  /** Nested reasons: makes the row collapsible. */
  children?: ReactNode
  /** Smaller type and no card look — used for the reasons inside a group. */
  nested?: boolean
}

/**
 * One problem as a row: name, a one-line plain-language summary (trend and peak, or the active band's values) and its
 * own small line chart per mileage band. A group row with reasons inside expands on click.
 */
export default function MotIssueRow({
  label,
  original,
  issue,
  edgesKm,
  mode,
  active,
  onActive,
  children,
  nested = false
}: Props): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const lead = mode === 'watch' ? issue.watch : issue.fail
  const peak = peakOf(lead)
  const trend = trendOf(lead)
  const expandable = children != null
  const activeText =
    active != null
      ? `${bandLabel(edgesKm, active)} ${t('mot.axis.kmShort')}: ${[
          mode !== 'watch' && `${t('mot.fail')} ${formatShare(issue.fail[active])}`,
          mode !== 'fail' && `${t('mot.watch')} ${formatShare(issue.watch[active])}`
        ]
          .filter(Boolean)
          .join(' · ')}`
      : null

  const text = (
    <span className="block min-w-0 text-left">
      <span className={cn('block font-medium', nested ? 'text-sm' : 'text-base')}>
        {expandable && (
          <span aria-hidden className={cn('mr-1 inline-block transition-transform', open && 'rotate-90')}>
            ▸
          </span>
        )}
        {label}
      </span>
      {original && (
        <span lang="en" className="block text-xs text-[var(--color-muted)]">
          {original}
        </span>
      )}
      <span className="block text-xs text-[var(--color-muted)]">
        {activeText ??
          (peak
            ? `${t(`mot.trend.${trend}`)} · ${t('mot.row.peak', {
                value: formatShare(peak.value),
                band: bandLabel(edgesKm, peak.band)
              })}`
            : t('mot.row.noData'))}
      </span>
    </span>
  )

  const spark = (
    <MotSparkline
      fail={issue.fail}
      watch={issue.watch}
      baselineFail={issue.baselineFail}
      baselineWatch={issue.baselineWatch}
      mode={mode}
      active={active}
      onActive={onActive}
      ariaLabel={t('mot.row.aria', { name: label })}
    />
  )

  return (
    <li className={cn('py-2', nested && 'pl-3')}>
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-1 py-1">
        {expandable ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
            className="min-w-0 flex-1 basis-40 rounded-lg px-1 py-1 text-left hover:bg-primary/10"
          >
            {text}
          </button>
        ) : (
          <div className="min-w-0 flex-1 basis-40">{text}</div>
        )}
        {spark}
      </div>

      {expandable && open && <ul className="mt-1 divide-y divide-[var(--color-border)]">{children}</ul>}
    </li>
  )
}
