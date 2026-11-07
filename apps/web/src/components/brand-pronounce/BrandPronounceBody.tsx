import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import Spinner from '@/components/ui/Spinner'
import { brandPronunciationQuery } from '@/lib/queries'

import { ipaLangName, visibleItems } from './helpers'

type Props = { slug: string }

/** Popover content: mounted only while the popover is open, so the request fires on first open. */
export default function BrandPronounceBody({ slug }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const { data, isPending, isError } = useQuery(brandPronunciationQuery(slug))

  if (isPending) return <Spinner />
  if (isError) return <p className="text-[var(--color-muted)]">{t('brandPronounce.error')}</p>

  return (
    <ul className="flex flex-col gap-2">
      {visibleItems(data.items).map(item => {
        const ipaLang = ipaLangName(item.ipaLang, i18n.language)
        return (
          <li key={item.lang}>
            <div className="text-xs text-[var(--color-muted)]">{t(`brandPronounce.${item.lang}`)}</div>
            {item.respell && <div className="text-base font-semibold">{item.respell}</div>}
            {item.ipa && (
              <div
                className="text-xs text-[var(--color-muted)]"
                title={ipaLang ? t('brandPronounce.ipaIn', { lang: ipaLang }) : t('brandPronounce.ipa')}
              >
                {`/${item.ipa}/`}
                {ipaLang ? ` (${ipaLang})` : ''}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
