import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  url: string
}

/** Official brand website chip: 🌐 icon + host + ↗, opens in a new tab. */
export default function BrandSiteChip({ url }: Props): ReactNode {
  const { t } = useTranslation()
  const host = new URL(url).hostname.replace(/^www\./, '')

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={t('result.officialSite')}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/20 px-2 py-0.5 text-xs text-[var(--color-fg)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
    >
      <span
        aria-hidden
        className="inline-block h-3.5 w-3.5 bg-current"
        style={{
          maskImage: 'url(/icons/official-site.svg)',
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center'
        }}
      />
      {host}
      <span aria-hidden>↗</span>
      <span className="sr-only">
        {t('result.officialSite')} — {t('field.opensNewTab')}
      </span>
    </a>
  )
}
