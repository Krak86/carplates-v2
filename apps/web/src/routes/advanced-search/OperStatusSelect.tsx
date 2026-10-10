import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { OperSuggestion } from '@carplates/shared'

import { OPER_STATUS_ICON, OPER_STATUSES, operStatus } from '@/lib/oper-info'

type Props = {
  value: string
  onChange: (value: string) => void
  operations: OperSuggestion[]
  className?: string
}

/** Registration-status filter: every operation code with the number of vehicles currently in it, grouped by status. */
export default function OperStatusSelect({ value, onChange, operations, className }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.language)

  // A shared link may carry a code the rollup doesn't list (yet); keep it selectable instead of silently dropping it.
  const known = operations.some(o => String(o.code) === value)

  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={className}>
      <option value="">{t('advancedSearch.anyOper')}</option>
      {value && !known && <option value={value}>{value}</option>}
      {OPER_STATUSES.map(status => {
        const group = operations.filter(o => operStatus(o.code) === status)
        if (group.length === 0) return null
        return (
          <optgroup key={status} label={`${OPER_STATUS_ICON[status]} ${t(`oper.status.${status}`)}`}>
            {group.map(o => (
              <option key={o.code} value={o.code}>
                {o.code} · {o.name ?? '—'} ({number.format(o.distinctPlates)})
              </option>
            ))}
          </optgroup>
        )
      })}
    </select>
  )
}
