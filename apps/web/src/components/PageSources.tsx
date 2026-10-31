import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'

export type PageSource = { label: string; url: string; note?: string }

type Props = {
  sources: readonly PageSource[]
  /** Plain lines under the links: where a fleet figure comes from, what was counted. */
  lines?: readonly string[]
  /** Extra small print at the bottom (shown period, caveats). */
  footer?: ReactNode
}

/** "Source data" strip at the top of a statistics page: where the numbers come from and what they cover. */
export default function PageSources({ sources, lines = [], footer }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <Card className="mb-4">
      <h2 className="mb-2 text-base font-semibold">{t('pageSources.title')}</h2>

      <ul className="space-y-1 text-sm">
        {sources.map(source => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium underline">
              {source.label}
            </a>
            {source.note && (
              <>
                {' '}
                <span className="text-[var(--color-muted)]">{source.note}</span>
              </>
            )}
          </li>
        ))}

        {lines.map(line => (
          <li key={line} className="text-[var(--color-muted)]">
            {line}
          </li>
        ))}
      </ul>

      {footer && <p className="mt-2 text-xs text-[var(--color-muted)]">{footer}</p>}
    </Card>
  )
}
