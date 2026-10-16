import {
  BODY_TYPES_PATH,
  ELECTRIC_PATH,
  FLEET_PATH,
  GENERATIONS_PATH,
  PLATES_PATH,
  SIZES_PATH
} from '@/routes/read/links'
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

export const FLEET_LEAD: L10n = {
  ua: 'Який колір найпопулярніший, на чому їздимо і чи старіє автопарк? Кольори, паливо та роки реєстрації — на даних усього реєстру.',
  ru: 'Какой цвет самый популярный, на чём ездим и стареет ли автопарк? Цвета, топливо и годы регистрации — на данных всего реестра.',
  en: 'Which colour is the most common, what do we run on, and is the fleet getting older? Colours, fuels and registration years across the whole registry.'
}

export const PLATES_LEAD: L10n = {
  ua: 'Що означають літери на номері, який код у вашого регіону і чим відрізняються старі та нові формати? Усі коди регіонів — і перевірка вашого номера.',
  ru: 'Что значат буквы на номере, какой код у вашего региона и чем отличаются старые и новые форматы? Все коды регионов — и проверка вашего номера.',
  en: 'What do the letters on a plate mean, which code is your region’s, and how do the old and new formats differ? Every region code, and a check for your own plate.'
}

export const GENERATIONS_LEAD: L10n = {
  ua: 'Наскільки Octavia, Golf чи Camry виросли за десятиліття? Довжина, ширина й колісна база кожного покоління — на даних реальних моделей з реєстру.',
  ru: 'Насколько Octavia, Golf или Camry выросли за десятилетия? Длина, ширина и колёсная база каждого поколения — на данных реальных моделей из реестра.',
  en: 'How much did the Octavia, Golf or Camry grow over the decades? Length, width and wheelbase of every generation, on real models from the registry.'
}

export const ELECTRIC_LEAD: L10n = {
  ua: 'Скільки в Україні електромобілів і гібридів, з яких років вони, де їх найбільше і які моделі найпопулярніші? Ще — чим відрізняються роз’єми зарядки.',
  ru: 'Сколько в Украине электромобилей и гибридов, каких они лет, где их больше всего и какие модели самые популярные? А ещё — чем отличаются разъёмы зарядки.',
  en: 'How many electric cars and hybrids does Ukraine have, which years are they from, where are they, and which models lead? Plus how the charging plugs differ.'
}

/** The published explainers, in hub order. A new article = a route in App.tsx + `STATIC_PAGES` (spa-text.ts) + an entry here. */
export const ARTICLES: readonly ArticleMeta[] = [
  { path: BODY_TYPES_PATH, icon: '🚙', titleKey: 'nav.readBodyTypes', lead: BODY_TYPES_LEAD },
  { path: SIZES_PATH, icon: '📏', titleKey: 'nav.readSizes', lead: SIZES_LEAD },
  { path: FLEET_PATH, icon: '🎨', titleKey: 'nav.readFleet', lead: FLEET_LEAD },
  { path: PLATES_PATH, icon: '🔢', titleKey: 'nav.readPlates', lead: PLATES_LEAD },
  { path: GENERATIONS_PATH, icon: '🧬', titleKey: 'nav.readGenerations', lead: GENERATIONS_LEAD },
  { path: ELECTRIC_PATH, icon: '🔌', titleKey: 'nav.readElectric', lead: ELECTRIC_LEAD }
]

/** Themes planned next, listed in the hub so readers see where it is going. */
export const UPCOMING: readonly UpcomingTopic[] = []
