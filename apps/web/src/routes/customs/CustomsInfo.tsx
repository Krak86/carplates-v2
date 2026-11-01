import type { ReactNode } from 'react'
import { UA_IMPORT_2026_1 } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { CUSTOMS_SOURCES, percent } from '@/routes/customs/helpers'

const rules = UA_IMPORT_2026_1

/** Rules audit (the constants in force, from the same object the calculation uses) and the official sources. */
export default function CustomsInfo(): ReactNode {
  const { t } = useTranslation()
  const { petrol, diesel, ageMin, ageMax, evEurPerKwh } = rules.excise
  const { tiers, topRate, subsistenceMinimumUah } = rules.pension

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="space-y-2">
        <h2 className="text-lg font-semibold">{t('customs.rules.title')}</h2>
        <p className="text-sm text-muted">
          {t('customs.rules.intro', { version: rules.version, from: rules.validFrom, to: rules.validTo })}
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>{t('customs.rules.duty', { rate: percent(rules.dutyRate) })}</li>
          <li>{t('customs.rules.petrol', { base: petrol.baseEur, above: petrol.aboveEur, cc: petrol.thresholdCc })}</li>
          <li>{t('customs.rules.diesel', { base: diesel.baseEur, above: diesel.aboveEur, cc: diesel.thresholdCc })}</li>
          <li>{t('customs.rules.age', { min: ageMin, max: ageMax })}</li>
          <li>{t('customs.rules.ev', { rate: evEurPerKwh })}</li>
          <li>{t('customs.rules.vat', { rate: percent(rules.vatRate) })}</li>
          <li>
            {t('customs.rules.pension', {
              minimum: subsistenceMinimumUah.toLocaleString('en'),
              t1: tiers[0]?.upToMinimums,
              r1: percent(tiers[0]?.rate ?? 0),
              t2: tiers[1]?.upToMinimums,
              r2: percent(tiers[1]?.rate ?? 0),
              r3: percent(topRate)
            })}
          </li>
        </ul>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-lg font-semibold">{t('customs.sources.title')}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {CUSTOMS_SOURCES.map(source => (
            <li key={source.key}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {t(`customs.sources.${source.key}`)}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">{t('customs.sources.note')}</p>
      </Card>
    </div>
  )
}
