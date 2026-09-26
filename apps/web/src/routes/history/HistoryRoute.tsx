import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import LocalRecordRow from '@/components/LocalRecordRow'
import LocalRecordsExportButton from '@/components/LocalRecordsExportButton'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { historyQuery } from '@/lib/queries'
import { formatMonthLabel, groupByMonth } from '@/routes/history/helpers'
import { useHistoryActions } from '@/routes/history/use-history-actions'

// Lazy-loaded (see App.tsx).
export default function HistoryRoute(): ReactNode {
  const { t, i18n } = useTranslation()
  const history = useQuery(historyQuery())
  const { deleteOne, deleteAll } = useHistoryActions()
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  const handleToggleMonth = (key: string): void => {
    setCollapsedMonths(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleDeleteAll = (): void => {
    if (window.confirm(t('history.confirmClearAll'))) deleteAll.mutate()
  }

  const groups = history.data ? groupByMonth(history.data) : []

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('history.title')}</h1>
        <div className="flex items-center gap-3">
          {history.data && history.data.length > 0 && (
            <LocalRecordsExportButton title={t('history.title')} entries={history.data} />
          )}
          {groups.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={deleteAll.isPending}
              className="text-sm text-[var(--color-primary)] underline hover:no-underline disabled:opacity-50"
            >
              {t('history.clearAll')}
            </button>
          )}
        </div>
      </div>

      {history.isPending && (
        <p className="flex items-center gap-2 text-[var(--color-muted)]">
          <Spinner /> {t('result.loading')}
        </p>
      )}

      {history.isSuccess && groups.length === 0 && <p className="text-[var(--color-muted)]">{t('history.empty')}</p>}

      <div className="space-y-3">
        {groups.map(group => {
          const isCollapsed = collapsedMonths.has(group.key)
          return (
            <Card key={group.key} className="p-0">
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() => handleToggleMonth(group.key)}
                className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
              >
                <span>{formatMonthLabel(group.key, i18n.language)}</span>
                <span className="text-[var(--color-muted)]">{isCollapsed ? '▸' : '▾'}</span>
              </button>

              <div
                aria-hidden={isCollapsed}
                className={cn(
                  'grid transition-[grid-template-rows] duration-300 ease-in-out',
                  isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
                )}
              >
                <div className="overflow-hidden">
                  <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
                    {group.entries.map(entry => (
                      <LocalRecordRow
                        key={entry.id}
                        value={entry.value}
                        label={entry.label}
                        date={entry.date}
                        deleteLabel={t('history.deleteOne')}
                        onDelete={() => deleteOne.mutate(entry.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
