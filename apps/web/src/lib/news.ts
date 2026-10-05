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
