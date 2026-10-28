import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { adminServerQuery } from '@/lib/queries'

const GB = 1024 ** 3
const CHART_W = 600
const CHART_H = 120

const formatGb = (bytes: number): string => `${(bytes / GB).toFixed(1)} GB`

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`
}

type TileProps = { label: string; value: string; sub?: string; percent?: number | null }

function Tile({ label, value, sub, percent }: TileProps): ReactNode {
  return (
    <Card>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-sm text-[var(--color-muted)]">{label}</div>
      {sub && <div className="text-xs text-[var(--color-muted)] tabular-nums">{sub}</div>}
      {percent != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-full bg-[var(--color-primary)]"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      )}
    </Card>
  )
}

type ChartProps = { title: string; points: { at: number; value: number }[]; max: number; unit: string }

function LineChart({ title, points, max, unit }: ChartProps): ReactNode {
  const first = points[0]
  const last = points.at(-1)
  const span = first && last ? Math.max(1, last.at - first.at) : 1
  const path = points
    .map((p, i) => {
      const x = ((p.at - (first?.at ?? 0)) / span) * CHART_W
      const y = CHART_H - (Math.min(p.value, max) / max) * CHART_H
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{title}</h2>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="h-32 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={title}
      >
        {[0.25, 0.5, 0.75].map(f => (
          <line
            key={f}
            x1={0}
            x2={CHART_W}
            y1={CHART_H * f}
            y2={CHART_H * f}
            stroke="var(--color-border)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-[var(--color-muted)] tabular-nums">
        <span>{first && new Date(first.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span>
          {last ? `${last.value.toFixed(1)} ${unit}` : ''} (max {max.toFixed(max < 10 ? 1 : 0)} {unit})
        </span>
        <span>{last && new Date(last.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </Card>
  )
}

export default function AdminServerTab(): ReactNode {
  const { t } = useTranslation()
  const server = useQuery(adminServerQuery())

  if (server.isPending) return <Spinner />
  if (server.isError) return <p className="text-red-600">{t('result.error')}</p>

  const s = server.data
  const latest = s.samples.at(-1)
  const memPercent = latest ? (latest.memUsedBytes / s.memTotalBytes) * 100 : null
  const diskPercent = s.diskTotalBytes && s.diskUsedBytes ? (s.diskUsedBytes / s.diskTotalBytes) * 100 : null

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile
          label={t('admin.server.cpu')}
          value={latest ? `${latest.cpuPercent.toFixed(0)}%` : '-'}
          sub={t('admin.server.cpuSub', { cores: s.cpuCores, load: s.load[0].toFixed(2) })}
          percent={latest?.cpuPercent}
        />
        <Tile
          label={t('admin.server.memory')}
          value={latest ? formatGb(latest.memUsedBytes) : '-'}
          sub={`/ ${formatGb(s.memTotalBytes)}`}
          percent={memPercent}
        />
        <Tile
          label={t('admin.server.disk')}
          value={s.diskUsedBytes != null ? formatGb(s.diskUsedBytes) : '-'}
          sub={s.diskTotalBytes != null ? `/ ${formatGb(s.diskTotalBytes)}` : undefined}
          percent={diskPercent}
        />
        <Tile label={t('admin.server.users')} value={s.users.toLocaleString()} />
        <Tile label={t('admin.server.dbSize')} value={s.dbSizeBytes != null ? formatGb(s.dbSizeBytes) : '-'} />
        <Tile label={t('admin.server.dbConnections')} value={s.dbConnections?.toString() ?? '-'} />
        <Tile label={t('admin.server.uptime')} value={formatDuration(s.uptimeSeconds)} sub={s.platform} />
        <Tile
          label={t('admin.server.apiMemory')}
          value={latest ? `${(latest.processRssBytes / 1024 ** 2).toFixed(0)} MB` : '-'}
          sub={`${s.nodeVersion}, ${formatDuration(s.processUptimeSeconds)}`}
        />
      </section>

      {s.samples.length < 2 ? (
        <p className="text-sm text-[var(--color-muted)]">{t('admin.server.collecting')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <LineChart
            title={t('admin.server.cpuChart')}
            points={s.samples.map(p => ({ at: p.at, value: p.cpuPercent }))}
            max={100}
            unit="%"
          />
          <LineChart
            title={t('admin.server.memChart')}
            points={s.samples.map(p => ({ at: p.at, value: p.memUsedBytes / GB }))}
            max={s.memTotalBytes / GB}
            unit="GB"
          />
        </div>
      )}

      <p className="text-xs text-[var(--color-muted)]">
        {s.cpuModel} · {t('admin.server.loadAvg')}: {s.load.map(l => l.toFixed(2)).join(' / ')}.{' '}
        {t('admin.server.resetNote')}
      </p>
    </div>
  )
}
