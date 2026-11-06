import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ExternalLink from '@/components/ExternalLink'
import { sourceLabel } from '@/components/OriginSection.helpers'

type Props = {
  url: string
}

export default function OriginSourceLink({ url }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <ExternalLink
      href={url}
      rel="noopener noreferrer nofollow"
      className="text-xs text-[var(--color-primary)] underline"
    >
      {t('origin.source')}: {sourceLabel(url)}
    </ExternalLink>
  )
}
