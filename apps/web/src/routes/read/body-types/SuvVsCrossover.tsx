import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { SUV_INTRO, SUV_NOTE, SUV_SIDES } from '@/routes/read/body-types/content'
import { pick, type ModelProfile } from '@/routes/read/helpers'
import ModelDimsRow from '@/routes/read/ModelDimsRow'

type Props = {
  find: (brand: string, model: string) => ModelProfile | undefined
}

/** SUV vs crossover: two constructions side by side, each with real models from the registry. */
export default function SuvVsCrossover({ find }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <Card id="suv" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.suv.title')}</h2>
      <p className="mb-3">{pick(SUV_INTRO, lang)}</p>

      <div className="grid gap-4 md:grid-cols-2">
        {[SUV_SIDES.frame, SUV_SIDES.crossover].map(side => (
          <section key={side.title.en} className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold">{pick(side.title, lang)}</h3>

            <ul className="list-disc space-y-1 pl-5">
              {side.points.map(point => (
                <li key={point.en}>{pick(point, lang)}</li>
              ))}
            </ul>

            <h4 className="mt-1 text-sm font-semibold">{t('read.examples')}</h4>
            {side.examples
              .flatMap(e => find(e.brand, e.model) ?? [])
              .map(profile => (
                <ModelDimsRow key={`${profile.model.brand}|${profile.model.model}`} profile={profile} />
              ))}
          </section>
        ))}
      </div>

      <p className="mt-3 text-sm text-muted">{pick(SUV_NOTE, lang)}</p>
    </Card>
  )
}
