import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { pick } from '@/routes/read/helpers'
import {
  APP_INTRO,
  APP_NOTE,
  APP_STEPS,
  ERROR_PHOTOS,
  ERRORS,
  ERRORS_CHECKLIST,
  ERRORS_INTRO,
  EXAMPLE_LINK_VIN,
  HISTORY,
  HISTORY_INTRO,
  LEGACY,
  LEGACY_INTRO,
  LEGACY_NOTE
} from '@/routes/read/vin/content'

/** How the VIN format came about, from maker-specific numbers to the 17-character standard. */
export function HistorySection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="history" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.vin.historyTitle')}</h2>
      <p className="mb-3 text-muted">{pick(HISTORY_INTRO, i18n.language)}</p>

      <ol className="space-y-3 border-l-2 border-border pl-4">
        {HISTORY.map(item => (
          <li key={item.when.en}>
            <h3 className="font-mono text-sm font-semibold">{pick(item.when, i18n.language)}</h3>
            <p className="text-sm">{pick(item.text, i18n.language)}</p>
          </li>
        ))}
      </ol>
    </Card>
  )
}

/** Pre-standard numbers: American, Japanese, European and Soviet-era patterns. */
export function LegacySection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="legacy" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.vin.legacyTitle')}</h2>
      <p className="mb-3 text-muted">{pick(LEGACY_INTRO, i18n.language)}</p>

      <ul className="mb-3 space-y-3">
        {LEGACY.map(row => (
          <li key={row.era.en} className="border-t border-border/50 pt-3 first:border-t-0 first:pt-0">
            <h3 className="font-medium">{pick(row.era, i18n.language)}</h3>
            {!!row.example && <p className="my-1 font-mono text-sm">{row.example}</p>}
            <p className="text-sm">{pick(row.text, i18n.language)}</p>
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted">
        {pick(LEGACY_NOTE, i18n.language)}{' '}
        <Link to="/read/plates" className="text-primary">
          {t('nav.readPlates')} →
        </Link>
      </p>
    </Card>
  )
}

/** Why a VIN may not decode, and the registry's own quirks. */
export function ErrorsSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="errors" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.vin.errorsTitle')}</h2>
      <p className="mb-3 text-muted">{pick(ERRORS_INTRO, i18n.language)}</p>

      <ul className="mb-4 space-y-3">
        {ERRORS.map(item => (
          <li key={item.id}>
            <h3 className="font-medium">{pick(item.title, i18n.language)}</h3>
            <p className="text-sm">{pick(item.text, i18n.language)}</p>
          </li>
        ))}
      </ul>

      <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ERROR_PHOTOS.map(photo => (
          <li key={photo.file}>
            <figure>
              <img
                src={`/read/vin/${photo.file}.webp`}
                alt={pick(photo.caption, i18n.language)}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
              />
              <figcaption className="mt-1 text-center text-xs text-muted">
                {pick(photo.caption, i18n.language)}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <h3 className="mb-1 font-medium">{t('read.vin.registryTitle')}</h3>
      <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
        <li>{t('read.vin.registrySince')}</li>
        <li>{t('read.vin.registryBody')}</li>
        <li>{t('read.vin.registryLimits')}</li>
      </ul>

      <p className="text-sm text-muted">{pick(ERRORS_CHECKLIST, i18n.language)}</p>
    </Card>
  )
}

/** How to look a VIN up in this app. */
export function AppSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="app" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.vin.appTitle')}</h2>
      <p className="mb-3 text-muted">{pick(APP_INTRO, i18n.language)}</p>

      <ol className="mb-3 list-decimal space-y-2 pl-5">
        {APP_STEPS.map(step => (
          <li key={step.title.en}>
            <span className="font-medium">{pick(step.title, i18n.language)}.</span> {pick(step.text, i18n.language)}
          </li>
        ))}
      </ol>

      <p className="mb-2 text-sm text-muted">{pick(APP_NOTE, i18n.language)}</p>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link to="/" className="text-primary">
          {t('read.vin.searchLink')}
        </Link>
        <Link to={`/${EXAMPLE_LINK_VIN}`} className="text-primary">
          {t('read.vin.exampleLink')}
        </Link>
      </p>
    </Card>
  )
}
