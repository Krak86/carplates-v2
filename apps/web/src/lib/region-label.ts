import { localizeRegion } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

export { localizeRegion }

/** `localizeRegion` bound to the current UI language (re-renders on language switch). */
export function useRegionLabel(): <T extends string | null | undefined>(name: T) => T {
  const { i18n } = useTranslation()
  return name => localizeRegion(name, i18n.language)
}
