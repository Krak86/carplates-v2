import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ExternalLink from '@/components/ExternalLink'

/** Engine credit (MIT licence asks for it) and the traffic-rules link, shown under the game in the modal and on `/race`. */
export default function RaceCredits(): ReactNode {
  const { t } = useTranslation()
  return (
    <>
      <p className="mt-3 text-xs text-[var(--color-muted)]">
        {t('race.credit')}{' '}
        <ExternalLink
          href="https://github.com/jakesgordon/javascript-racer"
          rel="noopener noreferrer nofollow"
          className="underline"
        >
          javascript-racer
        </ExternalLink>{' '}
        · Jake Gordon · MIT
      </p>

      <p className="mt-1 text-xs text-[var(--color-muted)]">
        <a href="https://pdr.infotech.gov.ua/" target="_blank" rel="noopener noreferrer nofollow" className="underline">
          {t('race.pdr')} ↗
        </a>
      </p>
    </>
  )
}
