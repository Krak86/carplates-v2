import type { L10n } from '@/routes/read/types'

export type RecallExample = { brand: string; model: string; year: number }

/** Models the article lets the reader flip between: all common in Ukraine, most sold in the US too (a few are not, on purpose). */
export const EXAMPLES: readonly RecallExample[] = [
  { brand: 'TOYOTA', model: 'COROLLA', year: 2012 },
  { brand: 'VOLKSWAGEN', model: 'GOLF', year: 2013 },
  { brand: 'FORD', model: 'FOCUS', year: 2012 },
  { brand: 'SKODA', model: 'OCTAVIA', year: 2012 },
  { brand: 'HONDA', model: 'CIVIC', year: 2012 }
]

export const KINDS_NOTE: L10n = {
  ua: 'Відкликання - це офіційна кампанія виробника: на всіх авто певної збірки знайшли заводський дефект безпеки, і ремонт роблять безкоштовно. Типова несправність — інше: це не заводський дефект, а те, що просто часто трапляється з віком і пробігом (гальма, шини, підвіска). Перше вказує на помилку конструкції, друге — на звичайне зношення.',
  ru: 'Отзыв — это официальная кампания производителя: на всех авто определённой сборки нашли заводской дефект безопасности, и ремонт делают бесплатно. Типичная неисправность — другое: это не заводской дефект, а то, что просто часто случается с возрастом и пробегом (тормоза, шины, подвеска). Первое указывает на ошибку конструкции, второе — на обычный износ.',
  en: 'A recall is an official manufacturer campaign: a factory safety defect was found on every car of a certain build, and the repair is free. A common fault is something else: not a factory defect, just what tends to go wrong with age and mileage (brakes, tyres, suspension). The first points to a design mistake, the second to ordinary wear.'
}

export const RECALLS_NOTE: L10n = {
  ua: 'Кампанії стосуються моделі певного ринку, а не конкретного авто. Українське авто часто зібране для іншого ринку, тож відкликання зі США чи ЄС може його не стосуватися — а може й стосуватися. Остаточно це знає лише офіційний дилер за VIN.',
  ru: 'Кампании относятся к модели определённого рынка, а не к конкретному авто. Украинское авто часто собрано для другого рынка, поэтому отзыв из США или ЕС может его не касаться — а может и касаться. Окончательно это знает только официальный дилер по VIN.',
  en: 'Campaigns cover a model on a particular market, not a particular car. A Ukrainian car is often built for another market, so a US or EU recall may or may not apply to it. Only an official dealer can say for sure, from the VIN.'
}

export const FAULTS_NOTE: L10n = {
  ua: 'Дані — британський техогляд MOT (DVSA, ліцензія OGL v3). Це британські авто в іншому кліматі й на інших дорогах, тож цифри показують загальну картину зношення моделі, а не прогноз для вашого авто. Консультативне зауваження («слідкуйте за…») — ще не відмова, але майбутній ремонт.',
  ru: 'Данные — британский техосмотр MOT (DVSA, лицензия OGL v3). Это британские авто в другом климате и на других дорогах, поэтому цифры показывают общую картину износа модели, а не прогноз для вашего авто. Рекомендация («следите за…») — ещё не отказ, но будущий ремонт.',
  en: 'The data is the UK MOT test (DVSA, OGL v3 licence). These are British cars in another climate and on other roads, so the figures show a model’s general wear pattern, not a forecast for your car. An advisory (“watch this”) is not a fail yet, but it is a repair coming.'
}

export type Reading = { key: 'recall' | 'fault' | 'check'; text: L10n }

export const READING: readonly Reading[] = [
  {
    key: 'recall',
    text: {
      ua: 'Багато відкликань моделі — не обов’язково погана якість: популярні моделі з відкритою звітністю просто мають більше кампаній, а виробники, що ретельно відстежують дефекти, відкликають частіше. Дивіться на суть дефекту, а не на кількість.',
      ru: 'Много отзывов модели — не обязательно плохое качество: популярные модели с открытой отчётностью просто имеют больше кампаний, а производители, тщательно отслеживающие дефекты, отзывают чаще. Смотрите на суть дефекта, а не на количество.',
      en: 'Many recalls for a model do not necessarily mean poor quality: popular models with open reporting simply have more campaigns, and makers that track defects closely recall more often. Look at what the defect is, not at the count.'
    }
  },
  {
    key: 'fault',
    text: {
      ua: 'Частка відмов зростає з пробігом майже в кожної моделі — це нормально. Порівнюйте модель із середнім по Британії на тому ж пробігу: лише різниця між ними щось говорить про саму модель.',
      ru: 'Доля отказов растёт с пробегом почти у каждой модели — это нормально. Сравнивайте модель со средним по Британии на том же пробеге: только разница между ними что-то говорит о самой модели.',
      en: 'The fail rate rises with mileage for almost every model, which is normal. Compare the model with the UK average at the same mileage: only the gap between them says something about the model itself.'
    }
  },
  {
    key: 'check',
    text: {
      ua: 'Перед купівлею: введіть номер або VIN у пошук — картка авто покаже відкликання, типові несправності та оцінки краш-тестів моделі. Потім запитайте дилера, чи виконані кампанії саме для цього VIN.',
      ru: 'Перед покупкой: введите номер или VIN в поиск — карточка авто покажет отзывы, типичные неисправности и оценки краш-тестов модели. Затем спросите дилера, выполнены ли кампании именно для этого VIN.',
      en: 'Before buying: enter the plate or VIN in the search — the car card shows the model’s recalls, common faults and crash-test ratings. Then ask a dealer whether the campaigns were carried out for that exact VIN.'
    }
  }
]
