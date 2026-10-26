import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { sourceLabel } from '@/components/OriginSection.helpers'

type Props = {
  url: string
}

export default function OriginSourceLink({ url }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-xs text-[var(--color-primary)] underline"
    >
      {t('origin.source')}: {sourceLabel(url)}
      <span className="sr-only"> {t('field.opensNewTab')}</span>
    </a>
  )
}
