import type { ReactNode } from 'react'
import { wikiSourceUrl, type WikiSource } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import { wikiSourceLabel } from '@/components/WikiSpecs.helpers'

type Props = {
  source: WikiSource | null | undefined
}

/** "Source: Wikipedia (RU)" link to the article one block's figures were read from; a curated row names its manufacturer page and access date instead. Nothing without a source. */
export default function WikiSourceLine({ source }: Props): ReactNode {
  const { t } = useTranslation()
  if (!source) return null

  return (
    <p className="mt-1 text-xs text-[var(--color-muted)]">
      {t('wikispec.source')}{' '}
      <a
        href={wikiSourceUrl(source)}
        target="_blank"
        rel="noreferrer noopener"
        className="text-[var(--color-primary)] underline hover:no-underline"
      >
        {wikiSourceLabel(source)}
      </a>
      {source.accessed && ` · ${t('wikispec.accessed', { date: source.accessed })}`}
    </p>
  )
}
