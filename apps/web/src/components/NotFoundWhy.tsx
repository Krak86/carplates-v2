import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { NOT_FOUND_LINKS, NOT_FOUND_REASONS, PLATES_UNTIL } from '@/components/NotFoundInfo.helpers'
import { toIntlLocale } from '@/lib/intl'
import { dataStatusQuery } from '@/lib/queries'

/** Why a well-formed plate is not in the registry data: coverage dates, the likely reasons and where to read more. */
export default function NotFoundWhy(): ReactNode {
  const { t, i18n } = useTranslation()
  const status = useQuery(dataStatusQuery())

  const format = new Intl.DateTimeFormat(toIntlLocale(i18n.language), { dateStyle: 'long', timeZone: 'UTC' })
  const day = (iso: string): string => format.format(new Date(`${iso}T00:00:00Z`))
  const lastRecord = status.data?.registry.lastDate ?? null

  return (
    <div className="mt-2 flex flex-col gap-2 text-sm">
      <p className="text-muted">{t('result.notFound.coverage', { date: day(PLATES_UNTIL) })}</p>
      {lastRecord && <p className="text-muted">{t('result.notFound.lastRecord', { date: day(lastRecord) })}</p>}

      <p className="font-medium">{t('result.notFound.whyTitle')}</p>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        {NOT_FOUND_REASONS.map(reason => (
          <li key={reason}>{t(`result.notFound.reason.${reason}`, { date: day(PLATES_UNTIL) })}</li>
        ))}
      </ul>

      <p className="font-medium">{t('result.notFound.readMore')}</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {NOT_FOUND_LINKS.map(link => (
          <li key={link.to}>
            <Link to={link.to} className="text-primary">
              {t(link.titleKey)} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
