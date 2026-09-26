import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'

const SOURCES = [
  { key: 'dataGovUa', label: 'data.gov.ua', url: 'https://data.gov.ua' },
  { key: 'nhtsa', label: 'NHTSA', url: 'https://www.nhtsa.gov' },
  { key: 'wikipedia', label: 'Wikipedia', url: 'https://www.wikipedia.org' },
  { key: 'pixabay', label: 'Pixabay', url: 'https://pixabay.com' },
  { key: 'euroncap', label: 'Euro NCAP', url: 'https://www.euroncap.com' },
  { key: 'jncap', label: 'JNCAP / NASVA', url: 'https://www.nasva.go.jp' },
  { key: 'cncap', label: 'C-NCAP / CATARC', url: 'https://www.c-ncap.org.cn' },
  { key: 'kncap', label: 'KNCAP', url: 'https://www.kncap.org' },
  { key: 'iihs', label: 'IIHS', url: 'https://www.iihs.org' }
] as const

// Lazy-loaded (see App.tsx).
export default function AboutRoute(): ReactNode {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t('about.heading')}</h1>

      <Card className="space-y-4 text-sm text-[var(--color-fg)]">
        <p>{t('about.p1')}</p>
        <p>{t('about.p2')}</p>
        <p>{t('about.p3')}</p>
        <p>{t('about.p4')}</p>
        <p>{t('about.p5')}</p>
        <p className="text-[var(--color-muted)]">
          {t('about.plateNotice')}{' '}
          <a
            href="https://leopolis.news/mvs-zakrylo-dani-pro-nomerni-znaky-avtomobiliv-biznes-vymagaye-skasuvaty-rishennya/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] underline"
          >
            {t('about.plateNoticeSource')} ↗
          </a>
        </p>

        <div className="border-t border-[var(--color-border)] pt-4">
          <h2 className="font-semibold">{t('about.licenseHeading')}</h2>
          <p className="mt-2">
            {t('about.copyright', { year })}{' '}
            <a
              href="https://carsua.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] underline"
            >
              carsua.app ↗
            </a>
          </p>
          <p className="mt-2">{t('about.licensePermission')}</p>
          <p className="mt-2">{t('about.licenseNotice')}</p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">{t('about.licenseWarranty')}</p>
        </div>
      </Card>

      <Card className="space-y-3 text-sm text-[var(--color-fg)]">
        <h2 className="font-semibold">{t('about.sourcesHeading')}</h2>
        <ul className="space-y-2">
          {SOURCES.map(source => (
            <li key={source.key}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--color-primary)] underline"
              >
                {source.label} ↗
              </a>
              <span className="text-[var(--color-muted)]"> — {t(`about.source.${source.key}`)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </article>
  )
}
