import type { L10n } from '@/routes/read/types'

export const HOW: L10n = {
  ua: 'Європейські «сегменти» - не закон і не стандарт, а ринкова звичка групувати авто за розміром. Ми відносимо модель до класу за її довжиною (за довідниками RDW/Вікіпедії), тож це орієнтир, а не офіційна класифікація. Седани й універсали в тому ж класі довші за хетчбеки, тому межі для них різні. SUV і мінівени мають власні класи J і M з чотирма розмірними словами.',
  ru: 'Европейские «сегменты» - не закон и не стандарт, а рыночная привычка группировать авто по размеру. Мы относим модель к классу по её длине (по справочникам RDW/Википедии), так что это ориентир, а не официальная классификация. Седаны и универсалы в том же классе длиннее хэтчбеков, поэтому границы для них разные. У SUV и минивэнов собственные классы J и M с четырьмя размерными словами.',
  en: 'The European “segments” are not a law or a standard, just a market habit of grouping cars by size. We place a model in a class by its length (from RDW and Wikipedia catalogues), so this is a rule of thumb, never an official class. Sedans and estates of the same class are longer than hatchbacks, so their cut-offs differ. SUVs and minivans have their own classes, J and M, with four size words.'
}

export const FLEET_NOTE: L10n = {
  ua: 'Рахуємо лише моделі з відомою довжиною; решта авто («не визначено») - моделі без каталожних розмірів.',
  ru: 'Считаем только модели с известной длиной; остальные авто («не определено») - модели без каталожных размеров.',
  en: 'Only models with a known length are placed; “not placed” cars are models without catalogue dimensions.'
}

export const FIT_INTRO: L10n = {
  ua: 'Найпопулярніші моделі в стандартних місцях для паркування. Враховано дзеркала (+20 см) і місце, щоб відчинити двері; деталі - у розділі «Розміри й паркування» на картці авто.',
  ru: 'Самые популярные модели в стандартных парковочных местах. Учтены зеркала (+20 см) и место, чтобы открыть дверь; подробности - в разделе «Размеры и парковка» на карточке авто.',
  en: 'The most popular models in standard parking places. Mirrors (+20 cm) and room to open the doors are counted; details are in the “Size & parking” section of the plate card.'
}

export const EXPLORER_INTRO: L10n = {
  ua: 'Оберіть тип кузова та клас - побачите моделі з реєстру, їх розміри та кількість. Кнопка «Показати номери» дістане кілька реальних авто цієї моделі.',
  ru: 'Выберите тип кузова и класс - увидите модели из реестра, их размеры и количество. Кнопка «Показать номера» достанет несколько реальных авто этой модели.',
  en: 'Pick a body type and a class to see models from the registry with their sizes and counts. “Show real plates” pulls a few real cars of that model.'
}

/** Models shown per segment in the table. */
export const TOP_PER_SEGMENT = 3
/** Rows of the fit table. */
export const FIT_MODELS = 8
/** Explorer rows before “show more”. */
export const EXPLORER_PAGE = 5
