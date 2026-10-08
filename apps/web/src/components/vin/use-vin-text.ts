import { useTranslation } from 'react-i18next'

import { localizeLabel, localizeValue, unitLabels, type Bilingual } from '@/components/vin/vin-text'
import type { Lang } from '@/i18n'

type VinText = {
  label: (variable: string) => Bilingual
  value: (variable: string, raw: string) => Bilingual
  units: { l: string; hp: string; kw: string }
}

/** NHTSA labels / values in the chosen language (the English original rides along in `en` when it differs). */
export function useVinText(): VinText {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language === 'ua' || i18n.language === 'ru' ? i18n.language : 'en') as Lang

  return {
    label: variable => localizeLabel(t, lang, variable),
    value: (variable, raw) => localizeValue(t, lang, variable, raw),
    units: unitLabels(t)
  }
}
