import type { Lang } from '@/i18n'

const INTL_LOCALE: Record<Lang, string> = { ua: 'uk-UA', ru: 'ru-RU', en: 'en-US' }

export function toIntlLocale(lang: string): string {
  return INTL_LOCALE[lang as Lang] ?? lang
}
