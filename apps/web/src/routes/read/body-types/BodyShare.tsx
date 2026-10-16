import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { normalizeBody } from '@carplates/shared'

import Card from '@/components/ui/Card'
import Skeleton from '@/components/ui/Skeleton'
import { statsFieldQuery } from '@/lib/queries'
import { formatCount } from '@/routes/read/helpers'

const TOP_BODIES = 8

/** What the registry's body field says most Ukrainian cars are: the top spellings as share bars, linking to /stats. */
export default function BodyShare(): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(statsFieldQuery('body'))

  const merged = new Map<string, number>()
  for (const row of data ?? []) {
    const body = normalizeBody(row.value)
    if (body) merged.set(body, (merged.get(body) ?? 0) + row.distinctPlates)
  }
  const total = [...merged.values()].reduce((sum, n) => sum + n, 0)
  const top = [...merged.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_BODIES)
  const biggest = top[0]?.[1] ?? 1

  return (
    <Card id="share" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.share.title')}</h2>
      <p className="mb-3 text-muted">{t('read.share.intro')}</p>

      {isPending && <Skeleton className="h-40 w-full rounded-lg" />}
      {isError && <p className="text-muted">{t('read.loadError')}</p>}

      <ul className="space-y-1.5">
        {top.map(([body, n]) => (
          <li key={body} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-2 text-sm">
            <span className="truncate">{body}</span>
            <span aria-hidden className="h-3 rounded-full bg-(--color-bg)">
              <span
                className="block h-3 rounded-full bg-primary"
                style={{ width: `${Math.max(2, (n / biggest) * 100)}%` }}
              />
            </span>
            <span className="tabular-nums">
              {Math.round((n / total) * 100)}% · {formatCount(n, i18n.language)}
            </span>
          </li>
        ))}
      </ul>

      <Link to="/stats?dim=body" className="mt-3 inline-block text-sm text-primary">
        {t('read.share.more')} →
      </Link>
    </Card>
  )
}
