import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

type Props = {
  /** Who receives the visitor's IP address when the embed loads ("OpenStreetMap", "Google", ...). */
  provider: string
  /** The provider also sets cookies (Disqus). */
  cookies?: boolean
}

/** One-line disclosure shown where a third-party embed is gated behind a click; links to the Privacy "Third-party services" section. */
export default function ThirdPartyNote({ provider, cookies = false }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <span className="inline-block rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-800 dark:text-amber-300">
      <span aria-hidden>⚠️ </span>
      {t(cookies ? 'thirdParty.cookies' : 'thirdParty.ip', { provider })}{' '}
      <Link to="/privacy#privacy-thirdParty" className="font-medium underline">
        {t('thirdParty.details')}
      </Link>
    </span>
  )
}
