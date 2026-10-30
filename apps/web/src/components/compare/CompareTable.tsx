import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import ReadGuideLink from '@/components/ReadGuideLink'
import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { toIntlLocale } from '@/lib/intl'
import { useRegionLabel } from '@/lib/region-label'
import type { GuidePath } from '@/routes/read/links'

import { formatWithUnit } from './format'
import type { FormatContext } from './format'
import { guidesByGroup } from './guides'
import { betterSide, isSame } from './rows'
import type { CompareSection } from './rows'
import type { CompareRow } from './types'
import { SIDE_COLOR } from './visuals'

type Props = {
  sections: readonly CompareSection[]
  /** Short names of car A and car B for the column heads. */
  names: readonly [string, string]
  /** Hide the rows where both cars show the same value. */
  diffOnly: boolean
  /** Either car is electric (the EV article is linked then). */
  electric: boolean
}

function GroupLabel({ group, exact }: { group: string; exact: boolean }): ReactNode {
  const { t } = useTranslation()
  return (
    <>
      {t(`compare.group.${group}`)}
      <span className="ml-2 text-xs font-normal text-[var(--color-muted)]">
        {t(exact ? 'compare.scope.exact' : 'compare.scope.model')}
      </span>
    </>
  )
}

function RowLabel({ row }: { row: CompareRow }): ReactNode {
  const { t } = useTranslation()
  return (
    <th scope="row" className="py-1.5 pr-2 text-left align-top text-base font-normal text-[var(--color-muted)]">
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {t(row.labelKey)}
        {row.aboutKey && (
          <InfoPopover label={t('compare.about.label', { field: t(row.labelKey) })} title={t(row.labelKey)}>
            <InfoText text={t(row.aboutKey)} />
          </InfoPopover>
        )}
        {row.smallSample && (
          <span role="img" aria-label={t('compare.smallSample')} title={t('compare.smallSample')}>
            ⚠️
          </span>
        )}
      </span>
    </th>
  )
}

function Cell({ row, side, ctx }: { row: CompareRow; side: 0 | 1; ctx: FormatContext }): ReactNode {
  const { t } = useTranslation()
  const better = betterSide(row) === side
  const value = row.values[side]
  return (
    <td
      className={cn(
        'py-1.5 pl-2 align-top text-base',
        better && 'font-semibold',
        value === null && 'text-[var(--color-muted)]'
      )}
      style={{ borderLeft: `3px solid ${SIDE_COLOR[side]}` }}
    >
      {formatWithUnit(row, value, ctx)}
      {better && (
        <>
          <span aria-hidden className="ml-1 text-[var(--color-primary)]">
            ✓
          </span>
          <span className="sr-only">{t('compare.better')}</span>
        </>
      )}
    </td>
  )
}

function SectionBody({
  section,
  diffOnly,
  ctx,
  guides
}: {
  section: CompareSection
  diffOnly: boolean
  ctx: FormatContext
  guides: readonly GuidePath[]
}): ReactNode {
  const rows = diffOnly ? section.rows.filter(r => !isSame(r)) : section.rows
  if (!section.pending && rows.length === 0) return null

  return (
    <tbody>
      <tr>
        <th
          colSpan={3}
          scope="colgroup"
          className="border-b border-[var(--color-border)] pt-4 pb-1 text-left text-lg font-semibold"
        >
          <GroupLabel group={section.group} exact={section.group === 'exact'} />
        </th>
      </tr>
      {section.pending ? (
        <tr>
          <td colSpan={3} className="py-2">
            <Skeleton className="h-16 w-full" />
          </td>
        </tr>
      ) : (
        rows.map(row => (
          <tr key={row.id} className="border-b border-[var(--color-border)]/50">
            <RowLabel row={row} />
            <Cell row={row} side={0} ctx={ctx} />
            <Cell row={row} side={1} ctx={ctx} />
          </tr>
        ))
      )}
      {!section.pending && guides.length > 0 && (
        <tr>
          <td colSpan={3} className="pt-1 pb-2">
            <div className="flex flex-wrap gap-2">
              {guides.map(guide => (
                <ReadGuideLink key={guide} guide={guide} className="mt-0" />
              ))}
            </div>
          </td>
        </tr>
      )}
    </tbody>
  )
}

/** The mirrored table: label | car A | car B, one `<tbody>` per group. Rows are already pruned by `pruneRows`. */
export default function CompareTable({ sections, names, diffOnly, electric }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const regionLabel = useRegionLabel()
  const ctx: FormatContext = { locale: toIntlLocale(i18n.language), lang: i18n.language, t, regionLabel }

  const guides = guidesByGroup(
    sections.filter(s => !s.pending && s.rows.length > 0).map(s => s.group),
    electric
  )

  return (
    <table className="w-full table-fixed border-collapse">
      <caption className="sr-only">{t('compare.tableCaption')}</caption>
      <colgroup>
        <col className="w-[34%]" />
        <col className="w-[33%]" />
        <col className="w-[33%]" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className="sr-only">
            {t('compare.column.measure')}
          </th>
          {names.map((name, side) => (
            <th
              key={side}
              scope="col"
              className="pb-1 pl-2 text-left text-base font-semibold break-words"
              style={{ borderBottom: `3px solid ${SIDE_COLOR[side as 0 | 1]}` }}
            >
              {name}
            </th>
          ))}
        </tr>
      </thead>
      {sections.map(section => (
        <SectionBody
          key={section.group}
          section={section}
          diffOnly={diffOnly}
          ctx={ctx}
          guides={guides[section.group] ?? []}
        />
      ))}
    </table>
  )
}
