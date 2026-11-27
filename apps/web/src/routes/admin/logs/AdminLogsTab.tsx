import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LOG_LEVELS } from '@carplates/shared'
import type { AdminLogLine } from '@carplates/shared'

import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { copyToClipboard } from '@/lib/share-section'
import {
  formatLogTime,
  fromLocalInput,
  LEVEL_CLASSES,
  lineKey,
  prettyMessage,
  RANGE_IDS,
  toLocalInput
} from './helpers'
import { useAdminLogsActions } from './use-admin-logs-actions'

const CONTROL = 'rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm'

type LineProps = { line: AdminLogLine }

function LogLine({ line }: LineProps): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async (): Promise<void> => {
    setCopied(await copyToClipboard(line.message))
  }

  return (
    <li className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-baseline gap-2 px-2 py-1 text-left font-mono text-xs hover:bg-[var(--color-bg)]"
      >
        <span className="shrink-0 text-[var(--color-muted)] tabular-nums">{formatLogTime(line.ts)}</span>
        <span
          className={cn('w-12 shrink-0 rounded px-1 text-center font-semibold uppercase', LEVEL_CLASSES[line.level])}
        >
          {line.level}
        </span>
        <span className="hidden shrink-0 text-[var(--color-muted)] md:inline">{line.container}</span>
        <span className={cn('min-w-0 flex-1', open ? 'break-all' : 'truncate')}>{line.message}</span>
      </button>
      {open && (
        <div className="space-y-2 bg-[var(--color-bg)] px-2 py-2">
          <pre className="max-h-96 overflow-auto font-mono text-xs break-all whitespace-pre-wrap">
            {prettyMessage(line.message)}
          </pre>
          <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
            <span>
              {line.container}, {line.ts}
            </span>
            <button type="button" onClick={copy} className="font-medium text-[var(--color-primary)]">
              {copied ? t('admin.logs.copied') : t('admin.logs.copy')}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

export default function AdminLogsTab(): ReactNode {
  const { t } = useTranslation()
  const { filters, logs, containers, setContainer, toggleLevel, setQuery, setRange, setCustom, setLive } =
    useAdminLogsActions()
  const [draft, setDraft] = useState(filters.q)

  const data = logs.data
  const body = ((): ReactNode => {
    if (logs.isError) return <p className="text-red-600">{t('result.error')}</p>
    if (!data) return <Spinner />
    if (data.status === 'disabled') return <p className="text-sm">{t('admin.logs.disabled')}</p>
    if (data.status === 'unavailable') return <p className="text-sm text-red-600">{t('admin.logs.unavailable')}</p>
    if (data.lines.length === 0) return <p className="text-sm text-[var(--color-muted)]">{t('admin.logs.empty')}</p>
    return (
      <>
        <ul className="overflow-hidden rounded-lg border border-[var(--color-border)]">
          {data.lines.map(line => (
            <LogLine key={lineKey(line)} line={line} />
          ))}
        </ul>
        {data.truncated && <p className="text-xs text-[var(--color-muted)]">{t('admin.logs.truncated')}</p>}
      </>
    )
  })()

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={e => {
            e.preventDefault()
            setQuery(draft)
          }}
        >
          <select
            aria-label={t('admin.logs.container')}
            value={filters.container ?? ''}
            onChange={e => setContainer(e.target.value)}
            className={CONTROL}
          >
            <option value="">{t('admin.logs.allContainers')}</option>
            {containers.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={draft}
            maxLength={200}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => setQuery(draft)}
            placeholder={t('admin.logs.search')}
            aria-label={t('admin.logs.search')}
            className={cn(CONTROL, 'min-w-48 flex-1')}
          />
          <div role="group" aria-label={t('admin.logs.levels')} className="flex gap-1">
            {LOG_LEVELS.map(level => {
              const on = filters.levels.includes(level)
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleLevel(level)}
                  className={cn(
                    'rounded-lg border px-2 py-1 font-mono text-xs uppercase',
                    on ? cn('border-transparent', LEVEL_CLASSES[level]) : 'border-[var(--color-border)] opacity-70'
                  )}
                >
                  {level}
                </button>
              )
            })}
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label={t('admin.logs.range')} className="flex gap-1">
            {RANGE_IDS.map(id => (
              <button
                key={id}
                type="button"
                aria-pressed={filters.range === id}
                onClick={() => setRange(id)}
                className={cn(
                  'rounded-lg border px-2 py-1 text-xs',
                  filters.range === id
                    ? 'border-[var(--color-primary)] bg-primary/10 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)]'
                )}
              >
                {id === 'custom' ? t('admin.logs.custom') : id}
              </button>
            ))}
          </div>
          {filters.range === 'custom' && (
            <>
              <input
                type="datetime-local"
                aria-label={t('admin.logs.from')}
                value={toLocalInput(filters.from)}
                onChange={e => setCustom(fromLocalInput(e.target.value), filters.to)}
                className={CONTROL}
              />
              <input
                type="datetime-local"
                aria-label={t('admin.logs.to')}
                value={toLocalInput(filters.to)}
                onChange={e => setCustom(filters.from, fromLocalInput(e.target.value))}
                className={CONTROL}
              />
            </>
          )}
          <label className={cn('ml-auto flex items-center gap-2 text-sm', filters.range === 'custom' && 'opacity-50')}>
            <input
              type="checkbox"
              checked={filters.live}
              disabled={filters.range === 'custom'}
              onChange={e => setLive(e.target.checked)}
            />
            {t('admin.logs.live')}
          </label>
          <button
            type="button"
            onClick={() => void logs.refetch()}
            disabled={logs.isFetching}
            className="text-sm font-medium text-[var(--color-primary)] disabled:opacity-50"
          >
            {t('admin.logs.refresh')}
          </button>
        </div>
      </Card>

      {body}
      <p className="text-xs text-[var(--color-muted)]">{t('admin.logs.note')}</p>
    </div>
  )
}
