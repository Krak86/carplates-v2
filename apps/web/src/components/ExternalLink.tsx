import type { ComponentProps, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = Omit<ComponentProps<'a'>, 'target'> & {
  href: string
  /** Adds the trailing ↗; off for image / card links that already read as a tile. */
  marker?: boolean
}

/**
 * The app's link to another site: opens a new tab, carries the ↗ marker and a screen-reader "opens in new tab".
 * Arrow convention: → a route of this app, ↗ another site (this component), ↓ / ↑ a jump inside the card,
 * ⤢ opens a popup (modal / dialog) on the same page.
 */
export default function ExternalLink({
  href,
  children,
  marker = true,
  rel = 'noopener noreferrer',
  ...rest
}: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <a {...rest} href={href} target="_blank" rel={rel}>
      {children}
      {marker && (
        <>
          {' '}
          <span aria-hidden>↗</span>
        </>
      )}
      <span className="sr-only"> {t('field.opensNewTab')}</span>
    </a>
  )
}
