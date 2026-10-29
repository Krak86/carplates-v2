import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { pick } from '@/routes/read/helpers'
import PlateSample from '@/routes/read/plates/PlateSample'
import {
  COLOR_KINDS,
  DIPLOMATIC_CODES,
  ERAS,
  GOVERNMENT_NOTE,
  KINDS_SOURCE,
  OCCUPATION_NOTE,
  SERIES_RULES,
  SERVICE_KINDS,
  type PlateKind
} from '@/routes/read/plates/kinds'

type KindListProps = {
  kinds: PlateKind[]
  yearsOf?: (id: string) => string | undefined
}

/** A sample plate next to its title and text, one row per kind. */
function KindList({ kinds, yearsOf }: KindListProps): ReactNode {
  const { i18n } = useTranslation()

  return (
    <ul className="space-y-4">
      {kinds.map(kind => {
        const title = pick(kind.title, i18n.language)
        const years = yearsOf?.(kind.id)

        return (
          <li
            key={kind.id}
            className="flex flex-col gap-2 border-t border-border/50 pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:gap-4"
          >
            <div className="shrink-0 sm:w-44">
              <PlateSample spec={kind.sample} label={title} />
            </div>

            <div>
              <h3 className="font-medium">
                {years && <span className="mr-2 font-mono text-primary">{years}</span>}
                {title}
              </h3>
              <p className="text-sm">{pick(kind.text, i18n.language)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Colour code of current plates plus the series letters of the 2020 standard. */
export function ColorsSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="colors" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.plates.colorsTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.plates.colorsIntro')}</p>

      <KindList kinds={COLOR_KINDS} />

      <h3 className="mt-4 mb-1 font-medium">{t('read.plates.seriesTitle')}</h3>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {SERIES_RULES.map(rule => (
          <li key={rule.en}>{pick(rule, i18n.language)}</li>
        ))}
      </ul>

      <p className="mt-3 text-sm text-muted">{t('read.plates.colorsNote')}</p>
    </Card>
  )
}

/** Military, police, diplomatic, transit and tractor plates, with the government-series note. */
export function ServicesSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="services" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.plates.servicesTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.plates.servicesIntro')}</p>

      <KindList kinds={SERVICE_KINDS} />

      <h3 className="mt-4 mb-1 font-medium">{t('read.plates.diplomaticCodes')}</h3>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {DIPLOMATIC_CODES.map(({ code, name }) => (
          <li key={code}>
            <span className="font-mono">{code}</span> {pick(name, i18n.language)}
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted">{pick(GOVERNMENT_NOTE, i18n.language)}</p>
    </Card>
  )
}

/** Timeline of plate generations from 1946, each with a drawn sample of its layout. */
export function HistorySection(): ReactNode {
  const { t, i18n } = useTranslation()

  const yearsOf = (id: string): string | undefined => ERAS.find(era => era.id === id)?.years

  return (
    <Card id="history" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.plates.historyTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.plates.historyIntro')}</p>

      <KindList kinds={ERAS} yearsOf={yearsOf} />

      <p className="mt-4 mb-2 text-sm text-muted">{pick(OCCUPATION_NOTE, i18n.language)}</p>
      <p className="text-sm text-muted">
        {t('read.plates.kindsSource')}{' '}
        <a href={KINDS_SOURCE.url} target="_blank" rel="noopener noreferrer" className="text-primary">
          {pick(KINDS_SOURCE.label, i18n.language)} ↗
        </a>
      </p>
    </Card>
  )
}
