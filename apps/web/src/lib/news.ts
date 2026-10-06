import type { TFunction } from 'i18next'
import type { NewsItem } from '@carplates/shared'

/** The infocar.ua "new models" feed titles an item with just the car's name ("KIA Stonic"). */
const NEW_MODEL_SOURCE = 'infocar-new-models'

/** Ukrainian UI shows Ukrainian-language news only; Russian and English UIs show everything. */
export function newsLangFilter(uiLang: string): 'uk' | undefined {
  return uiLang === 'ua' ? 'uk' : undefined
}

/** The headline to show — a bare car name gets a "New model:" prefix so it reads as a headline. */
export function newsTitle(item: Pick<NewsItem, 'source' | 'title'>, t: TFunction): string {
  return item.source === NEW_MODEL_SOURCE ? t('news.newModel', { title: item.title }) : item.title
}

/** Shortest title search /news runs (the API enforces the same). */
export const NEWS_SEARCH_MIN_CHARS = 3

/** Items per page on /news. */
export const NEWS_PAGE_SIZE = 10

/** Filter chips on /news: one per outlet (infocar.ua / Carscoops publish several feeds), each covering its feed ids from `scripts/news-sources.json`. */
export const NEWS_SOURCE_GROUPS = [
  { key: 'infocar', label: 'infocar.ua', ids: ['infocar-news', 'infocar-new-models', 'infocar-tests'] },
  { key: 'eauto', label: 'eauto.org.ua', ids: ['eauto'] },
  { key: 'autoua', label: 'autoua.net', ids: ['autoua'] },
  { key: 'mezha', label: 'mezha.ua', ids: ['mezha'] },
  { key: 'novyny-live', label: 'novyny.live', ids: ['novyny-live'] },
  { key: 'caranddriver', label: 'Car and Driver', ids: ['caranddriver'] },
  { key: 'motor1', label: 'Motor1', ids: ['motor1'] },
  { key: 'carscoops', label: 'Carscoops', ids: ['carscoops-news', 'carscoops-reviews'] }
] as const

/** Feed ids behind the selected chip keys. */
export function sourceIdsOf(keys: string[]): string[] {
  return NEWS_SOURCE_GROUPS.filter(g => keys.includes(g.key)).flatMap(g => g.ids)
}
