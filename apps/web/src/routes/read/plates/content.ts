import type { L10n } from '@/routes/read/types'

// Facts below come from the HSC (hsc.gov.ua) pages listed in `SOURCES` (plate types article of 2023-03-24, the custom-plate
// order page, the samples PDF of MIA order No. 166). Prices are as published there (2023): never restate them as current.

export const DIIA_ORDER_URL = 'https://diia.gov.ua/services/zamovlennya-individualnogo-nomernogo-znaka'
export const LEISURE_CHECK_URL = 'https://solutions.mvs.gov.ua/check-leisure-license-plates'
export const ORDER_VIDEO_URL = 'https://www.youtube.com/watch?v=EaHwGNc8cck'

export const SOURCES: { url: string; label: L10n }[] = [
  {
    url: 'https://hsc.gov.ua/2023/03/24/yaki-isnuyut-tipi-nomernih-znakiv-v-ukrayini-ta-chim-voni-vidriznyayutsya/',
    label: {
      ua: 'ГСЦ МВС: які існують типи номерних знаків',
      ru: 'ГСЦ МВД: какие существуют типы номерных знаков',
      en: 'MIA HSC: which plate types exist'
    }
  },
  {
    url: 'https://hsc.gov.ua/wp-content/uploads/2021/04/Zrazki-nomernih-znakiv-na-sajt.pdf',
    label: {
      ua: 'Зразки номерних знаків (PDF, наказ МВС № 166)',
      ru: 'Образцы номерных знаков (PDF, приказ МВД № 166)',
      en: 'Plate samples (PDF, MIA order No. 166)'
    }
  },
  {
    url: 'https://hsc.gov.ua/index/poslugi/nomerni-znaki-vigotovlennya-ta-zberigannya/vigotovlennya-maketiv-individualnih-nomernih-znakiv-transportnih-zasobiv-yaki-vigotovlyayutsya-na-zamovlennya-vlasnikiv-transportnih-zasobiv-z-vidacheyu-nomernih-znakiv-za-odin-komplekt-tri-simvoli-ko/',
    label: {
      ua: 'ГСЦ МВС: виготовлення індивідуальних знаків (документи, вартість, відмови)',
      ru: 'ГСЦ МВД: изготовление индивидуальных знаков (документы, стоимость, отказы)',
      en: 'MIA HSC: custom plates (documents, prices, refusals)'
    }
  },
  {
    url: 'https://hsc.gov.ua/index/poslugi/faq/yak-otrimati-individualnij-nomernij-znak/',
    label: {
      ua: 'ГСЦ МВС: як отримати індивідуальний номерний знак',
      ru: 'ГСЦ МВД: как получить индивидуальный номерной знак',
      en: 'MIA HSC: how to get a custom plate'
    }
  },
  {
    url: 'https://zakon.rada.gov.ua/go/z0353-21',
    label: {
      ua: 'Наказ МВС № 166 від 02.03.2021',
      ru: 'Приказ МВД № 166 от 02.03.2021',
      en: 'MIA order No. 166 of 2 March 2021'
    }
  }
]

export type PlateType = {
  id: string
  /** Files in `public/read/types/` (cropped from the HSC samples PDF). */
  images: string[]
  title: L10n
  text: L10n
  /** An extra link under the text (`url` + label). */
  link?: { url: string; label: L10n }
}

export const PLATE_TYPES: PlateType[] = [
  {
    id: 'standard',
    images: ['standard', 'atypical', 'trailer', 'moped', 'moto'],
    title: {
      ua: 'Стандартні (державної реєстрації)',
      ru: 'Стандартные (государственной регистрации)',
      en: 'Standard (state registration)'
    },
    text: {
      ua: 'Їх отримують усі транспортні засоби при першій реєстрації чи перереєстрації: на синьому полі «UA» і прапор, далі дві літери регіону, чотири цифри й дві літери серії. Чорні символи - для всіх автомобілів, причепів, мотоциклів і мопедів. Для авто з неформатним місцем кріплення («американських») знак квадратніший, у два рядки; причепи, мопеди й мотоцикли мають власну форму.',
      ru: 'Их получают все транспортные средства при первой регистрации или перерегистрации: на синем поле «UA» и флаг, затем две буквы региона, четыре цифры и две буквы серии. Чёрные символы - для всех автомобилей, прицепов, мотоциклов и мопедов. Для авто с неформатным местом крепления («американских») знак квадратнее, в две строки; прицепы, мопеды и мотоциклы имеют собственную форму.',
      en: 'Every vehicle gets these at first registration or re-registration: a blue field with “UA” and the flag, then two region letters, four digits and two series letters. Black characters are used for all cars, trailers, motorcycles and mopeds. Cars with a non-standard mounting place (the “American” type) get a squarer, two-line plate; trailers, mopeds and motorcycles have their own shapes.'
    }
  },
  {
    id: 'electric',
    images: ['ev', 'ev-bus'],
    title: {
      ua: 'Електромобілі (зелені символи)',
      ru: 'Электромобили (зелёные символы)',
      en: 'Electric vehicles (green characters)'
    },
    text: {
      ua: 'Зелені літери й цифри - для транспорту з електродвигуном без двигуна внутрішнього згоряння. Кріпляться за бажанням власника й дають право паркуватися на відведених місцях. Для електробусів і електротаксі тло жовте, символи зелені.',
      ru: 'Зелёные буквы и цифры - для транспорта с электродвигателем без двигателя внутреннего сгорания. Крепятся по желанию владельца и дают право парковаться на отведённых местах. Для электробусов и электротакси фон жёлтый, символы зелёные.',
      en: 'Green letters and digits are for vehicles driven by an electric motor with no combustion engine. They are fitted at the owner’s wish and give the right to park in the reserved spaces. Electric buses and taxis have a yellow background with green characters.'
    }
  },
  {
    id: 'taxi',
    images: ['taxi'],
    title: {
      ua: 'Автобуси й таксі (жовте тло)',
      ru: 'Автобусы и такси (жёлтый фон)',
      en: 'Buses and taxis (yellow background)'
    },
    text: {
      ua: 'Для автобусів і таксі, внесених до Єдиного державного реєстру юридичних осіб та ФОП як засоби господарської діяльності з перевезення пасажирів автомобільним транспортом.',
      ru: 'Для автобусов и такси, внесённых в Единый государственный реестр юридических лиц и ФЛП как средства хозяйственной деятельности по перевозке пассажиров автомобильным транспортом.',
      en: 'For buses and taxis entered in the state register of legal entities and sole traders as a means of passenger-transport business.'
    }
  },
  {
    id: 'chosen',
    images: [],
    title: {
      ua: 'Платні з визначеною комбінацією цифр',
      ru: 'Платные с определённой комбинацией цифр',
      en: 'Paid plates with a chosen digit combination'
    },
    text: {
      ua: 'Видаються за бажанням власника (наприклад, КА 7777 АА): у вартість входить і сама комбінація. Їх кількість обмежена - в одному регіоні кожної комбінації може бути не більше 144, тож вони є не завжди. Наявність і вартість у сервісних центрах перевіряють онлайн.',
      ru: 'Выдаются по желанию владельца (например, КА 7777 АА): в стоимость входит и сама комбинация. Их количество ограничено - в одном регионе каждой комбинации может быть не больше 144, поэтому они есть не всегда. Наличие и стоимость в сервисных центрах проверяют онлайн.',
      en: 'Issued at the owner’s wish (for example КА 7777 АА): the price includes the combination itself. They are limited - at most 144 of each combination per region - so they are not always available. Availability and price at the service centres can be checked online.'
    },
    link: {
      url: LEISURE_CHECK_URL,
      label: {
        ua: 'Перевірка доступних номерних знаків',
        ru: 'Проверка доступных номерных знаков',
        en: 'Check available plates'
      }
    }
  },
  {
    id: 'custom',
    images: ['custom'],
    title: {
      ua: 'Індивідуальні (свій напис)',
      ru: 'Индивидуальные (своя надпись)',
      en: 'Custom (your own inscription)'
    },
    text: {
      ua: 'Додаток до державного знака, що виготовляється на замовлення власника: окремий шрифт, українські й латинські літери. Для авто - від 3 до 8 символів, для мотоциклів - від 3 до 6, літер не менше двох. Як замовити - нижче.',
      ru: 'Дополнение к государственному знаку, изготавливаемое по заказу владельца: отдельный шрифт, украинские и латинские буквы. Для авто - от 3 до 8 символов, для мотоциклов - от 3 до 6, букв не менее двух. Как заказать - ниже.',
      en: 'An addition to the state plate, made to order: its own typeface, Ukrainian and Latin letters. 3 to 8 characters for a car, 3 to 6 for a motorcycle, with at least two letters. How to order is below.'
    }
  },
  {
    id: 'departmental',
    images: ['rescue', 'border', 'guard'],
    title: {
      ua: 'Відомчі (з емблемою служби)',
      ru: 'Ведомственные (с эмблемой службы)',
      en: 'Departmental (with a service emblem)'
    },
    text: {
      ua: 'Для транспорту, що підлягає відомчій реєстрації (ст. 34 Закону «Про дорожній рух»): оперативно-рятувальна служба цивільного захисту (літера Е), Державна прикордонна служба (В), Національна гвардія (G), кожна з емблемою. Для них є й мотоциклетні знаки.',
      ru: 'Для транспорта, подлежащего ведомственной регистрации (ст. 34 Закона «О дорожном движении»): оперативно-спасательная служба гражданской защиты (буква Е), Государственная пограничная служба (В), Национальная гвардия (G), каждая с эмблемой. Для них есть и мотоциклетные знаки.',
      en: 'For vehicles under departmental registration (Art. 34 of the Law on Road Traffic): the civil-protection rescue service (letter Е), the State Border Guard Service (В) and the National Guard (G), each with its emblem. Motorcycle versions exist too.'
    }
  }
]

export const OLD_PLATES_NOTE: L10n = {
  ua: 'Знаки, видані до наказу № 166 (2021), можна використовувати на дорогах, але під час будь-якої реєстраційної операції їх обов’язково обмінюють (заміна - орієнтовно 336 грн, ціна з сайту ГСЦ).',
  ru: 'Знаки, выданные до приказа № 166 (2021), можно использовать на дорогах, но при любой регистрационной операции их обязательно обменивают (замена - ориентировочно 336 грн, цена с сайта ГСЦ).',
  en: 'Plates issued before order No. 166 (2021) may still be used on the road, but any registration operation requires exchanging them (about 336 UAH per the HSC site).'
}

export const ORDER_STEPS: L10n[] = [
  {
    ua: 'Онлайн: в Кабінеті водія (електронний підпис, BankID або Дія.Підпис). Свідоцтво про реєстрацію вже має відображатися в кабінеті; система перевіряє, чи вільний напис. Графічний елемент онлайн додати не можна.',
    ru: 'Онлайн: в Кабинете водителя (электронная подпись, BankID или Дія.Подпись). Свидетельство о регистрации уже должно отображаться в кабинете; система проверяет, свободна ли надпись. Графический элемент онлайн добавить нельзя.',
    en: 'Online: in the Driver’s Cabinet (e-signature, BankID or Diia.Signature). The registration certificate must already show in the cabinet; the system checks that the inscription is free. A graphic element cannot be added online.'
  },
  {
    ua: 'Офлайн: у будь-якому сервісному центрі МВС - свідоцтво про реєстрацію, паспорт (або інший документ з переліку), заява та квитанція про оплату.',
    ru: 'Офлайн: в любом сервисном центре МВД - свидетельство о регистрации, паспорт (или другой документ из перечня), заявление и квитанция об оплате.',
    en: 'Offline: at any MIA service centre - the registration certificate, a passport (or another listed document), an application and the payment receipt.'
  },
  {
    ua: 'Вартість за сторінкою ГСЦ: 300 грн - три символи, +90 грн за кожен наступний (до восьми), 500 грн - графічний елемент (лише офлайн), плюс вартість самих знаків; тарифи регулює постанова КМУ № 795. Перевіряйте актуальні суми.',
    ru: 'Стоимость по странице ГСЦ: 300 грн - три символа, +90 грн за каждый следующий (до восьми), 500 грн - графический элемент (только офлайн), плюс стоимость самих знаков; тарифы регулирует постановление КМУ № 795. Проверяйте актуальные суммы.',
    en: 'Prices per the HSC page: 300 UAH for three characters, +90 UAH for each further one (up to eight), 500 UAH for a graphic element (offline only), plus the plates themselves; the tariffs are set by Cabinet resolution No. 795. Check the current amounts.'
  },
  {
    ua: 'Виготовлення - до 40 днів. Комплект забирають у Києві (вул. Мрії, 19) або замовляють доставку «Новою поштою» (500 грн + тариф перевізника).',
    ru: 'Изготовление - до 40 дней. Комплект забирают в Киеве (ул. Мрии, 19) или заказывают доставку «Новой почтой» (500 грн + тариф перевозчика).',
    en: 'Making takes up to 40 days. Collect the set in Kyiv (19 Mrii St) or order Nova Poshta delivery (500 UAH plus the carrier’s fee).'
  },
  {
    ua: 'Після отримання обов’язкова перереєстрація авто в будь-якому сервісному центрі, самостійно кріпити знак не можна. Перезакріпити його на інше авто чи передати іншій особі можна офлайн у сервісному центрі.',
    ru: 'После получения обязательна перерегистрация авто в любом сервисном центре, самостоятельно крепить знак нельзя. Перезакрепить его на другое авто или передать другому лицу можно офлайн в сервисном центре.',
    en: 'After receiving it the car must be re-registered at any service centre; you may not fit it yourself. It can be re-assigned to another car or handed to another person offline at a service centre.'
  }
]

export const ORDER_RULES: L10n = {
  ua: 'Можуть відмовити, якщо напис не відповідає вимогам: літери «Z» і «V» окремо та слова кирилицею із «З», «С», «В», «Ф» замість латинських (символіка вторгнення) заборонені; не можна дискримінаційні чи ненормативні написи, символіку установ і торгові марки без згоди, імітацію державних символів, комбінації, схожі на державні знаки; якщо напис починається з двох літер, вони не мають збігатися з літерами регіону.',
  ru: 'Могут отказать, если надпись не соответствует требованиям: буквы «Z» и «V» отдельно и слова кириллицей с «З», «С», «В», «Ф» вместо латинских (символика вторжения) запрещены; нельзя дискриминационные или нецензурные надписи, символику учреждений и торговые марки без согласия, имитацию государственных символов, комбинации, похожие на государственные знаки; если надпись начинается с двух букв, они не должны совпадать с буквами региона.',
  en: 'A request can be refused if the inscription breaks the rules: the letters “Z” and “V” on their own, and Cyrillic words using “З”, “С”, “В”, “Ф” in place of Latin letters (invasion symbolism), are banned; so are discriminatory or obscene text, institutions’ emblems and trademarks without consent, imitations of state symbols, and combinations that look like state plates; a start of two letters must not equal a region’s letters.'
}

export const EXAMPLE_LINK_PLATE = 'КА1234ВС'

export type SearchStep = { title: L10n; text: L10n }

export const SEARCH_INTRO: L10n = {
  ua: 'Знак із цієї статті можна одразу перевірити в застосунку: розшифровка регіону, марка, модель, рік, історія реєстрацій з відкритого реєстру, розшук і відкликання.',
  ru: 'Знак из этой статьи можно сразу проверить в приложении: расшифровка региона, марка, модель, год, история регистраций из открытого реестра, розыск и отзывные кампании.',
  en: 'Any plate from this guide can be checked in the app right away: the region, make, model, year, the registration history from the open registry, the wanted check and recalls.'
}

export const SEARCH_STEPS: SearchStep[] = [
  {
    title: { ua: 'Впишіть номер', ru: 'Впишите номер', en: 'Type the plate' },
    text: {
      ua: 'На головній у полі «Номерний знак або VIN». Латиниця й кирилиця схожих літер не відрізняються (A і А), пробіли та дефіси не заважають.',
      ru: 'На главной в поле «Номерной знак или VIN». Латиница и кириллица похожих букв не различаются (A и А), пробелы и дефисы не мешают.',
      en: 'On the home page, in the “Plate number or VIN” box. Look-alike Latin and Cyrillic letters count as the same (A and А), and spaces or dashes do not matter.'
    }
  },
  {
    title: { ua: 'Або знайдіть за фото', ru: 'Или найдите по фото', en: 'Or search by a photo' },
    text: {
      ua: 'Кнопка «Пошук за фото»: завантажте знімок авто, і застосунок сам знайде на ньому номерний знак (або кілька, якщо їх видно декілька) та відкриє результат. Розпізнавання працює у вашому браузері. Краще, щоб знак був у кадрі цілком, без сильного нахилу й відблисків.',
      ru: 'Кнопка «Поиск по фото»: загрузите снимок авто, и приложение само найдёт на нём номерной знак (или несколько, если их видно несколько) и откроет результат. Распознавание работает в вашем браузере. Лучше, чтобы знак был в кадре целиком, без сильного наклона и бликов.',
      en: 'The “Search by image” button: upload a photo of a car and the app finds the plate in it (or several, if more than one is visible) and opens the result. Recognition runs in your browser. It works best when the whole plate is in frame, not strongly tilted and free of glare.'
    }
  },
  {
    title: { ua: 'AR-режим: наведіть камеру', ru: 'AR-режим: наведите камеру', en: 'AR mode: point the camera' },
    text: {
      ua: 'Кнопка «AR-скан» вмикає камеру телефона чи ноутбука. Спершу в браузері завантажується невелика модель, що шукає на відео номерні знаки; потім поверх живого зображення малюється рамка навколо знака, а символи зчитуються з кадру. Для прочитаного номера підтягується коротка картка (регіон, марка, модель, рік), а «Відкрити повний результат» веде до повної картки. «Авто-показ» робить це сам для кожного нового знака. Розпізнавання відбувається на пристрої. Режим у бета-версії: слабке світло, швидкий рух чи брудний знак знижують точність, тому звіряйте прочитане з самим знаком.',
      ru: 'Кнопка «AR-скан» включает камеру телефона или ноутбука. Сначала в браузере загружается небольшая модель, ищущая на видео номерные знаки; затем поверх живого изображения рисуется рамка вокруг знака, а символы считываются с кадра. Для прочитанного номера подтягивается короткая карточка (регион, марка, модель, год), а «Открыть полный результат» ведёт к полной карточке. «Авто-показ» делает это сам для каждого нового знака. Распознавание происходит на устройстве. Режим в бета-версии: слабый свет, быстрое движение или грязный знак снижают точность, поэтому сверяйте прочитанное с самим знаком.',
      en: 'The “AR scan” button turns on the camera of your phone or laptop. First a small model that looks for plates in video is loaded in the browser; then a frame is drawn over the live picture around the plate and the characters are read from it. For a plate that was read, a short card (region, make, model, year) is fetched, and “Open full result” leads to the full card. “Auto-show” does that by itself for every new plate. Recognition runs on your device. The mode is in beta: dim light, fast motion or a dirty plate lower accuracy, so check what was read against the plate itself.'
    }
  },
  {
    title: { ua: 'Якщо нічого не знайдено', ru: 'Если ничего не найдено', en: 'If nothing is found' },
    text: {
      ua: 'Знак може бути не в реєстрі (реєстр відкритий з 2013 року), належати до іншої країни або стояти на авто без запису під цим номером. Перевірте символи, спробуйте VIN.',
      ru: 'Знак может отсутствовать в реестре (реестр открыт с 2013 года), принадлежать другой стране или стоять на авто без записи под этим номером. Проверьте символы, попробуйте VIN.',
      en: 'The plate may be absent from the registry (it is open since 2013), belong to another country, or sit on a car with no record under that number. Recheck the characters and try the VIN.'
    }
  }
]

export const SEARCH_NOTE: L10n = {
  ua: 'Результат - це дані з відкритих джерел, а не офіційна довідка: перед покупкою звіряйте їх із документами й самим авто.',
  ru: 'Результат - это данные из открытых источников, а не официальная справка: перед покупкой сверяйте их с документами и самим авто.',
  en: 'The result is open-source data, not an official certificate: check it against the documents and the car itself before buying.'
}
