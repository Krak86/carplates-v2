import type { L10n } from '@/routes/read/types'

export const WEIGHT_NOTE: L10n = {
  ua: 'Вага - споряджена маса з реєстру; для легковиків, яких знає голландська база RDW, беремо типову масу RDW. Це «межа діапазону» моделі (1-й / 99-й перцентиль), тож одна помилкова картка не потрапить на вершину.',
  ru: 'Вес - снаряжённая масса из реестра; для легковых, которые знает нидерландская база RDW, берём типичную массу RDW. Это «край диапазона» модели (1-й / 99-й перцентиль), поэтому одна ошибочная карточка не попадёт на вершину.',
  en: 'Weight is the unladen mass from the registry; for passenger cars the Dutch RDW database knows, RDW’s typical mass is used instead. It is the model’s range edge (1st / 99th percentile), so one mistyped record cannot top the list.'
}

export const SPEC_NOTE: L10n = {
  ua: 'Потужність і об’єм - із реєстру (5-й / 95-й перцентиль моделі). Висота й довжина - типові значення RDW або Вікіпедії. Бак - лише з Вікіпедії, тому рейтингу за баком поки мало моделей. Електромобілі не мають об’єму двигуна й не потрапляють у цей список.',
  ru: 'Мощность и объём - из реестра (5-й / 95-й перцентиль модели). Высота и длина - типичные значения RDW или Википедии. Бак - только из Википедии, поэтому в рейтинге по баку пока мало моделей. У электромобилей нет объёма двигателя, и в этот список они не попадают.',
  en: 'Power and engine size come from the registry (the model’s 5th / 95th percentile). Height and length are typical RDW or Wikipedia values. The tank is from Wikipedia only, so few models are ranked by it yet. Electric cars have no engine size and are skipped in that list.'
}

export type Reading = { key: 'weight' | 'spec' | 'floor'; text: L10n }

export const READING: readonly Reading[] = [
  {
    key: 'weight',
    text: {
      ua: 'Це маса порожнього транспорту, а не вантажопідйомність чи дозволена максимальна маса. Вкладка «Усі» змішує мотоцикли й сідельні тягачі, тому для чесного порівняння оберіть одну групу.',
      ru: 'Это масса порожнего транспорта, а не грузоподъёмность и не разрешённая максимальная масса. Вкладка «Все» смешивает мотоциклы и седельные тягачи, поэтому для честного сравнения выберите одну группу.',
      en: 'This is the mass of the empty vehicle, not its payload or permitted maximum mass. The “All” tab mixes motorcycles and tractor units, so pick a single group for a fair comparison.'
    }
  },
  {
    key: 'spec',
    text: {
      ua: 'Списки за характеристиками - лише для легковиків. Фургони, зареєстровані як легкові (Crafter, Transit…), потрапляють сюди як легкові. Потужність у кВт, а в дужках - к. с.',
      ru: 'Списки по характеристикам - только для легковых. Фургоны, зарегистрированные как легковые (Crafter, Transit…), попадают сюда как легковые. Мощность в кВт, в скобках - л. с.',
      en: 'The spec lists cover passenger cars only. Vans filed as cars in the registry (Crafter, Transit…) rank as cars. Power is in kW, with horsepower in brackets.'
    }
  },
  {
    key: 'floor',
    text: {
      ua: 'У рейтинг потрапляють моделі з щонайменше кількома сотнями зареєстрованих авто, тож рідкісні суперкари й унікальні машини тут не змагаються. Це про моделі, а не про окремі авто.',
      ru: 'В рейтинг попадают модели как минимум с несколькими сотнями зарегистрированных авто, поэтому редкие суперкары и уникальные машины здесь не соревнуются. Это про модели, а не про отдельные авто.',
      en: 'A model needs at least a few hundred registered vehicles to be ranked, so rare supercars and one-offs do not compete here. These are models, not individual cars.'
    }
  }
]
