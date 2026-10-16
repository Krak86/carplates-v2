import {
  BODY_TYPES_PATH,
  ELECTRIC_PATH,
  EXTREMES_PATH,
  FLEET_PATH,
  FUEL_PATH,
  GENERATIONS_PATH,
  GUIDE_META,
  IMPORTS_PATH,
  PLATES_PATH,
  RECALLS_PATH,
  SAFETY_PATH,
  SIZES_PATH,
  VIN_PATH
} from '@/routes/read/links'
import type { ArticleMeta, L10n, UpcomingTopic } from '@/routes/read/types'

export const BODY_TYPES_LEAD: L10n = {
  ua: 'Седан, хетчбек чи універсал? SUV чи кросовер? Коротко про кожен тип кузова - і реальні приклади з українського реєстру, з номерами.',
  ru: 'Седан, хэтчбек или универсал? SUV или кроссовер? Коротко о каждом типе кузова - и реальные примеры из украинского реестра, с номерами.',
  en: 'Sedan, hatchback or estate? SUV or crossover? A short guide to every body type, with real examples from the Ukrainian registry - plates included.'
}

export const SIZES_LEAD: L10n = {
  ua: 'Що означають класи A, B, C, D, J, M? Наскільки великий «компакт» і чи влізе він у ваш паркомісце? Класи за довжиною - на реальних авто з реєстру.',
  ru: 'Что означают классы A, B, C, D, J, M? Насколько велик «компакт» и влезет ли он на ваше парковочное место? Классы по длине - на реальных авто из реестра.',
  en: 'What do the A, B, C, D, J and M classes mean? How big is a “compact”, and will it fit your parking space? Classes by length, shown on real cars from the registry.'
}

export const FLEET_LEAD: L10n = {
  ua: 'Який колір найпопулярніший, на чому їздимо і чи старіє автопарк? Кольори, паливо та роки реєстрації - на даних усього реєстру.',
  ru: 'Какой цвет самый популярный, на чём ездим и стареет ли автопарк? Цвета, топливо и годы регистрации - на данных всего реестра.',
  en: 'Which colour is the most common, what do we run on, and is the fleet getting older? Colours, fuels and registration years across the whole registry.'
}

export const PLATES_LEAD: L10n = {
  ua: 'Що означають літери на номері, який код у вашого регіону і чим відрізняються старі та нові формати? Усі коди регіонів - і перевірка вашого номера.',
  ru: 'Что значат буквы на номере, какой код у вашего региона и чем отличаются старые и новые форматы? Все коды регионов - и проверка вашего номера.',
  en: 'What do the letters on a plate mean, which code is your region’s, and how do the old and new formats differ? Every region code, and a check for your own plate.'
}

export const GENERATIONS_LEAD: L10n = {
  ua: 'Наскільки Octavia, Golf чи Camry виросли за десятиліття? Довжина, ширина й колісна база кожного покоління - на даних реальних моделей з реєстру.',
  ru: 'Насколько Octavia, Golf или Camry выросли за десятилетия? Длина, ширина и колёсная база каждого поколения - на данных реальных моделей из реестра.',
  en: 'How much did the Octavia, Golf or Camry grow over the decades? Length, width and wheelbase of every generation, on real models from the registry.'
}

export const ELECTRIC_LEAD: L10n = {
  ua: 'Скільки в Україні електромобілів і гібридів, з яких років вони, де їх найбільше і які моделі найпопулярніші? Ще - чим відрізняються роз’єми зарядки.',
  ru: 'Сколько в Украине электромобилей и гибридов, каких они лет, где их больше всего и какие модели самые популярные? А ещё - чем отличаются разъёмы зарядки.',
  en: 'How many electric cars and hybrids does Ukraine have, which years are they from, where are they, and which models lead? Plus how the charging plugs differ.'
}

export const IMPORTS_LEAD: L10n = {
  ua: 'Скільки авто ввезено з-за кордону, а скільки куплено через дилера, які моделі ввозять найчастіше і що VIN каже про країну виробництва? Ще - що перевірити перед купівлею.',
  ru: 'Сколько авто ввезено из-за границы, а сколько куплено через дилера, какие модели ввозят чаще всего и что VIN говорит о стране сборки? А ещё - что проверить перед покупкой.',
  en: 'How many cars were brought in from abroad and how many bought through a dealer, which models are imported most, and what does the VIN say about the country of build? Plus what to check before buying.'
}

export const SAFETY_LEAD: L10n = {
  ua: 'Які авто на наших дорогах мають оцінки краш-тестів, як вони змінюються з роками випуску і які моделі найкращі та найслабші? Ще - що ці оцінки не кажуть.',
  ru: 'Какие авто на наших дорогах имеют оценки краш-тестов, как они меняются по годам выпуска и какие модели лучшие и слабейшие? А ещё - о чём эти оценки не говорят.',
  en: 'Which cars on our roads have crash-test ratings, how do they change with the model year, and which models are the best and the weakest? Plus what those ratings do not tell you.'
}

export const FUEL_LEAD: L10n = {
  ua: 'На чому їздить Україна, скільки CO₂ викидає середнє авто, чи чистішає парк із роками і які моделі найекономніші та найвитратніші? Ще - як ми оцінюємо викиди.',
  ru: 'На чём ездит Украина, сколько CO₂ выбрасывает среднее авто, чистеет ли парк с годами и какие модели самые экономичные и самые затратные? А ещё - как мы оцениваем выбросы.',
  en: 'What does Ukraine run on, how much CO₂ does the average car emit, is the fleet getting cleaner with the years, and which models are the cleanest and the most CO₂-heavy? Plus how we estimate emissions.'
}

export const VIN_LEAD: L10n = {
  ua: 'Що означають 17 символів VIN, як за ним дізнатися виробника, країну й модельний рік і де його знайти на авто? Розбір будь-якого VIN - прямо на сторінці.',
  ru: 'Что означают 17 символов VIN, как по нему узнать производителя, страну и модельный год и где его найти на авто? Разбор любого VIN - прямо на странице.',
  en: 'What do the 17 characters of a VIN mean, how do you read the maker, country and model year off it, and where is it on the car? Break down any VIN right on the page.'
}

export const EXTREMES_LEAD: L10n = {
  ua: 'Яка модель найважча, а яка найлегша, хто найпотужніший і найбільший? Рекордсмени реєстру за вагою, потужністю, об’ємом двигуна, розмірами й баком - і як читати ці списки.',
  ru: 'Какая модель самая тяжёлая, а какая самая лёгкая, кто самый мощный и самый большой? Рекордсмены реестра по весу, мощности, объёму двигателя, размерам и баку - и как читать эти списки.',
  en: 'Which model is the heaviest and which the lightest, which is the most powerful and the biggest? The registry’s record holders by weight, power, engine size, dimensions and fuel tank, and how to read the lists.'
}

export const RECALLS_LEAD: L10n = {
  ua: 'Що таке відкликання, чим воно відрізняється від типової несправності і що ламається в моделі з пробігом? Кампанії ЄС, США й Канади та британські дані техогляду - на прикладі популярних моделей.',
  ru: 'Что такое отзыв, чем он отличается от типичной неисправности и что ломается в модели с пробегом? Кампании ЕС, США и Канады и британские данные техосмотра - на примере популярных моделей.',
  en: 'What is a recall, how does it differ from a common fault, and what wears out on a model as the miles add up? EU, US and Canadian campaigns and UK inspection data, shown on popular models.'
}

const PUBLISHED = '2026-10-16'

/** The published explainers, in hub order. A new article = a route in App.tsx + `STATIC_PAGES` (spa-text.ts) + `GUIDE_META` (links.ts) + an entry here. */
export const ARTICLES: readonly ArticleMeta[] = [
  { path: BODY_TYPES_PATH, ...GUIDE_META[BODY_TYPES_PATH], lead: BODY_TYPES_LEAD, published: PUBLISHED },
  { path: SIZES_PATH, ...GUIDE_META[SIZES_PATH], lead: SIZES_LEAD, published: PUBLISHED },
  { path: FLEET_PATH, ...GUIDE_META[FLEET_PATH], lead: FLEET_LEAD, published: PUBLISHED },
  { path: PLATES_PATH, ...GUIDE_META[PLATES_PATH], lead: PLATES_LEAD, published: PUBLISHED },
  { path: VIN_PATH, ...GUIDE_META[VIN_PATH], lead: VIN_LEAD, published: PUBLISHED },
  { path: GENERATIONS_PATH, ...GUIDE_META[GENERATIONS_PATH], lead: GENERATIONS_LEAD, published: PUBLISHED },
  { path: ELECTRIC_PATH, ...GUIDE_META[ELECTRIC_PATH], lead: ELECTRIC_LEAD, published: PUBLISHED },
  { path: IMPORTS_PATH, ...GUIDE_META[IMPORTS_PATH], lead: IMPORTS_LEAD, published: PUBLISHED },
  { path: SAFETY_PATH, ...GUIDE_META[SAFETY_PATH], lead: SAFETY_LEAD, published: PUBLISHED },
  { path: FUEL_PATH, ...GUIDE_META[FUEL_PATH], lead: FUEL_LEAD, published: PUBLISHED },
  { path: EXTREMES_PATH, ...GUIDE_META[EXTREMES_PATH], lead: EXTREMES_LEAD, published: PUBLISHED },
  { path: RECALLS_PATH, ...GUIDE_META[RECALLS_PATH], lead: RECALLS_LEAD, published: PUBLISHED }
]

/** Themes planned next, listed in the hub so readers see where it is going. */
export const UPCOMING: readonly UpcomingTopic[] = []
