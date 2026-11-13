import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  /** Privacy section id (`cookies` | `retention`); row copy lives at `legal.privacy.<id>.<row>.n|p|k`. */
  id: string
  rows: readonly string[]
  /** Cookie tables have a purpose column, retention tables do not. */
  purpose: boolean
}

export default function LegalTable({ id, rows, purpose }: Props): ReactNode {
  const { t } = useTranslation()
  const th = 'px-2 py-1.5 text-left font-medium'
  const td = 'px-2 py-1.5 align-top'

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-xs">
        <thead className="text-muted">
          <tr className="border-b border-border">
            <th className={th}>{t(purpose ? 'legal.table.cookie' : 'legal.table.data')}</th>
            {purpose && <th className={th}>{t('legal.table.purpose')}</th>}
            <th className={th}>{t('legal.table.kept')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row} className="border-b border-border last:border-0">
              <td className={`${td} ${purpose ? 'font-mono' : ''}`}>{t(`legal.privacy.${id}.${row}.n`)}</td>
              {purpose && <td className={td}>{t(`legal.privacy.${id}.${row}.p`)}</td>}
              <td className={td}>{t(`legal.privacy.${id}.${row}.k`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
