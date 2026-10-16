import { BODY_TYPES_PATH, SIZES_PATH } from '@/routes/read/links'
import type { ArticleMeta, L10n, UpcomingTopic } from '@/routes/read/types'

export const BODY_TYPES_LEAD: L10n = {
  ua: 'Седан, хетчбек чи універсал? SUV чи кросовер? Коротко про кожен тип кузова — і реальні приклади з українського реєстру, з номерами.',
  ru: 'Седан, хэтчбек или универсал? SUV или кроссовер? Коротко о каждом типе кузова — и реальные примеры из украинского реестра, с номерами.',
  en: 'Sedan, hatchback or estate? SUV or crossover? A short guide to every body type, with real examples from the Ukrainian registry — plates included.'
}

export const SIZES_LEAD: L10n = {
  ua: 'Що означають класи A, B, C, D, J, M? Наскільки великий «компакт» і чи влізе він у ваш паркомісце? Класи за довжиною — на реальних авто з реєстру.',
  ru: 'Что означают классы A, B, C, D, J, M? Насколько велик «компакт» и влезет ли он на ваше парковочное место? Классы по длине — на реальных авто из реестра.',
  en: 'What do the A, B, C, D, J and M classes mean? How big is a “compact”, and will it fit your parking space? Classes by length, shown on real cars from the registry.'
}

/** The published explainers, in hub order. A new article = a route in App.tsx + `STATIC_PAGES` (spa-text.ts) + an entry here. */
export const ARTICLES: readonly ArticleMeta[] = [
  { path: BODY_TYPES_PATH, icon: '🚙', titleKey: 'nav.readBodyTypes', lead: BODY_TYPES_LEAD },
  { path: SIZES_PATH, icon: '📏', titleKey: 'nav.readSizes', lead: SIZES_LEAD }
]

/** Themes planned next, listed in the hub so readers see where it is going. */
export const UPCOMING: readonly UpcomingTopic[] = [
  {
    icon: '🎨',
    title: {
      ua: 'Що їздить Україною: кольори, паливо, вік автопарку',
      ru: 'Что ездит по Украине: цвета, топливо, возраст автопарка',
      en: 'What Ukraine drives: colours, fuel, fleet age'
    }
  },
  {
    icon: '🔢',
    title: {
      ua: 'Номерні знаки: коди регіонів і нові формати',
      ru: 'Номерные знаки: коды регионов и новые форматы',
      en: 'Number plates: region codes and new formats'
    }
  },
  {
    icon: '🧬',
    title: {
      ua: 'Як модель росла за поколіннями (Octavia, Camry…)',
      ru: 'Как модель росла по поколениям (Octavia, Camry…)',
      en: 'How a model grew across generations (Octavia, Camry…)'
    }
  }
]
