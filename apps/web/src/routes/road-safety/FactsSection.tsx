import type { ReactNode } from 'react'
import type { RoadSafetyRegionsResponse } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { toIntlLocale } from '@/lib/intl'
import { regionFacts } from '@/routes/road-safety/helpers'

type Props = {
  regions: RoadSafetyRegionsResponse['regions']
  year: number
}

/** Interesting cases of the year as short sentences: extremes of deaths, rate, lethality and deaths against the fleet share. */
export default function FactsSection({ regions, year }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const int = new Intl.NumberFormat(locale)
  const one = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })
  const facts = regionFacts(regions)
  if (!facts) return null

  const items: { key: string; icon: string; text: string }[] = [
    {
      key: 'most',
      icon: '🔺',
      text: t('roadSafety.facts.most', {
        region: facts.mostDeaths.region,
        deaths: int.format(facts.mostDeaths.deaths),
        year
      })
    },
    {
      key: 'fewest',
      icon: '🔻',
      text: t('roadSafety.facts.fewest', {
        region: facts.fewestDeaths.region,
        deaths: int.format(facts.fewestDeaths.deaths)
      })
    },
    { key: 'top3', icon: '🧮', text: t('roadSafety.facts.top3', { share: Math.round(facts.top3Share) }) }
  ]

  if (facts.highestRate?.deathsPer100k != null && facts.lowestRate?.deathsPer100k != null) {
    items.push(
      {
        key: 'rateHigh',
        icon: '🚗',
        text: t('roadSafety.facts.rateHigh', {
          region: facts.highestRate.region,
          rate: one.format(facts.highestRate.deathsPer100k)
        })
      },
      {
        key: 'rateLow',
        icon: '🛣️',
        text: t('roadSafety.facts.rateLow', {
          region: facts.lowestRate.region,
          rate: one.format(facts.lowestRate.deathsPer100k)
        })
      }
    )
  }

  if (facts.deadliest && facts.safest) {
    items.push(
      {
        key: 'deadliest',
        icon: '⚠️',
        text: t('roadSafety.facts.deadliest', { region: facts.deadliest.region, n: one.format(facts.deadliest.per100) })
      },
      {
        key: 'leastDeadly',
        icon: '✅',
        text: t('roadSafety.facts.leastDeadly', { region: facts.safest.region, n: one.format(facts.safest.per100) })
      }
    )
  }

  if (facts.overRepresented && facts.underRepresented) {
    items.push(
      {
        key: 'over',
        icon: '📈',
        text: t('roadSafety.facts.over', {
          region: facts.overRepresented.region,
          ratio: one.format(facts.overRepresented.ratio)
        })
      },
      {
        key: 'under',
        icon: '📉',
        text: t('roadSafety.facts.under', {
          region: facts.underRepresented.region,
          ratio: one.format(facts.underRepresented.ratio)
        })
      }
    )
  }

  return (
    <Card className="mb-6">
      <h2 className="mb-3 text-base font-semibold">{t('roadSafety.facts.title')}</h2>

      <ul className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
        {items.map(item => (
          <li key={item.key} className="flex gap-2">
            <span aria-hidden>{item.icon}</span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
