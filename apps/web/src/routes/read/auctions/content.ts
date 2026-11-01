import type { L10n } from '@/routes/read/types'

// Facts below come from the sources in `SOURCES` and are dated. The copy never quotes deposit sizes, steps, fees or deadlines
// (they change with the Procedure and differ per lot): it says where the rules live and to read the lot page.

export type Fact = { id: string; title: L10n; text: L10n }
export type TimelineItem = { when: L10n; text: L10n }
export type Source = { href: string; title: L10n; note: L10n }

export const SECTIONS = {
  lots: { ua: 'Що таке лот', ru: 'Что такое лот', en: 'What a lot is' },
  live: { ua: 'У цифрах', ru: 'В цифрах', en: 'In numbers' },
  take: { ua: 'Як взяти участь', ru: 'Как принять участие', en: 'How to take part' },
  world: { ua: 'У світі', ru: 'В мире', en: 'Elsewhere' },
  history: { ua: 'Історія', ru: 'История', en: 'History' },
  check: { ua: 'Перед купівлею', ru: 'Перед покупкой', en: 'Before you buy' },
  sources: { ua: 'Джерела', ru: 'Источники', en: 'Sources' }
} as const satisfies Record<string, L10n>

export const LOTS_TITLE: L10n = {
  ua: 'Що таке лот на українському аукціоні',
  ru: 'Что такое лот на украинском аукционе',
  en: 'What a lot is at a Ukrainian auction'
}

export const LOTS_INTRO: L10n = {
  ua: 'Більшість авто на українських електронних аукціонах - це арештоване або конфісковане майно, яке продають у межах виконавчого провадження. Продавець - не автосалон, а держава через організатора торгів, тому стан і документи авто можуть бути будь-якими.',
  ru: 'Большинство авто на украинских электронных аукционах - это арестованное или конфискованное имущество, которое продают в рамках исполнительного производства. Продавец - не автосалон, а государство через организатора торгов, поэтому состояние и документы авто могут быть любыми.',
  en: 'Most cars at Ukrainian electronic auctions are seized or confiscated property sold in an enforcement proceeding. The seller is not a dealer but the state, through the auction organiser, so the condition and the papers of a car can be anything.'
}

export const LOTS: Fact[] = [
  {
    id: 'lot',
    title: { ua: 'Лот', ru: 'Лот', en: 'A lot' },
    text: {
      ua: 'Одиниця продажу з власним номером: одне авто (або інше майно), стартова ціна, регіон і стан торгів. Номер лота з відкритих даних - не те саме, що адреса сторінки лота на сайті СЕТАМ.',
      ru: 'Единица продажи с собственным номером: одно авто (или другое имущество), стартовая цена, регион и состояние торгов. Номер лота из открытых данных - не то же самое, что адрес страницы лота на сайте СЕТАМ.',
      en: 'A unit of sale with its own number: one car (or other property), a start price, a region and a trading status. The lot number in the open data is not the same as the address of the lot page on the SETAM site.'
    }
  },
  {
    id: 'rounds',
    title: { ua: 'Кілька лотів на одне авто', ru: 'Несколько лотов на одно авто', en: 'Several lots for one car' },
    text: {
      ua: 'Якщо торги не відбулися, авто виставляють знову новим лотом, часто з іншою ціною. Тому в історії одного номера чи VIN буває кілька лотів - дивіться на останній і на всю послідовність.',
      ru: 'Если торги не состоялись, авто выставляют снова новым лотом, часто с другой ценой. Поэтому в истории одного номера или VIN бывает несколько лотов - смотрите на последний и на всю последовательность.',
      en: 'When a sale fails, the car is listed again as a new lot, often at another price. So one plate or VIN can have several lots: look at the latest one and at the whole sequence.'
    }
  },
  {
    id: 'sold',
    title: { ua: 'Продано чи ні', ru: 'Продано или нет', en: 'Sold or not' },
    text: {
      ua: 'У нас «продано» означає, що в даних є ціна продажу. Решта лотів - не продані, відкриті для ставок або зупинені. Ціна продажу - це ціна торгів, а не оцінка стану авто.',
      ru: 'У нас «продано» означает, что в данных есть цена продажи. Остальные лоты - не проданные, открытые для ставок или остановленные. Цена продажи - это цена торгов, а не оценка состояния авто.',
      en: 'Here “sold” means the data holds a sale price. The other lots are unsold, open for bids or stopped. A sale price is the price of the auction, not a verdict on the condition of the car.'
    }
  }
]

export const LIVE_TITLE: L10n = {
  ua: 'Що показують наші дані',
  ru: 'Что показывают наши данные',
  en: 'What our data shows'
}

export const LIVE_INTRO: L10n = {
  ua: 'Легкові та вантажні авто з відкритих даних СЕТАМ і Prozorro.Продажів, які ми завантажуємо щодня. Це лише ті лоти, що потрапили в набір даних, а не весь ринок.',
  ru: 'Легковые и грузовые авто из открытых данных СЕТАМ и Prozorro.Продажи, которые мы загружаем ежедневно. Это только те лоты, что попали в набор данных, а не весь рынок.',
  en: 'Cars and trucks from the open data of SETAM and Prozorro.Sale, which we load daily. These are only the lots in the dataset, not the whole market.'
}

export const LIVE_NOTE: L10n = {
  ua: 'Ціна продажу - це ціна торгів, а не оцінка стану авто: низька ціна не означає вигідну покупку, тож перевіряйте авто.',
  ru: 'Цена продажи - это цена торгов, а не оценка состояния авто: низкая цена не означает выгодную покупку, так что проверяйте авто.',
  en: 'A sale price is the price of the auction, not a verdict on the car: a low price is not a bargain by itself, so check the car.'
}

export const TAKE_TITLE: L10n = {
  ua: 'Як взяти участь',
  ru: 'Как принять участие',
  en: 'How to take part'
}

export const TAKE_INTRO: L10n = {
  ua: 'Точні суми, строки й вимоги задає Порядок реалізації арештованого майна та умови конкретного лота, тому ми їх не переписуємо: вони змінюються. Загальна схема така.',
  ru: 'Точные суммы, сроки и требования задаёт Порядок реализации арестованного имущества и условия конкретного лота, поэтому мы их не переписываем: они меняются. Общая схема такая.',
  en: 'The exact sums, deadlines and requirements are set by the Procedure for selling seized property and by the terms of each lot, so we do not copy them: they change. The general flow is this.'
}

export const TAKE_STEPS: Fact[] = [
  {
    id: 'register',
    title: { ua: 'Зареєструйтесь', ru: 'Зарегистрируйтесь', en: 'Register' },
    text: {
      ua: 'Для участі потрібен обліковий запис на сайті організатора або на одному з майданчиків, підключених до системи.',
      ru: 'Для участия нужна учётная запись на сайте организатора или на одной из площадок, подключённых к системе.',
      en: 'You need an account on the organiser’s site or on one of the platforms connected to the system.'
    }
  },
  {
    id: 'apply',
    title: { ua: 'Подайте заявку на лот', ru: 'Подайте заявку на лот', en: 'Apply for the lot' },
    text: {
      ua: 'Заявка подається окремо на кожен лот. Відкрийте сторінку лота й прочитайте умови: опис, фото, стартову ціну, дату торгів.',
      ru: 'Заявка подаётся отдельно на каждый лот. Откройте страницу лота и прочитайте условия: описание, фото, стартовую цену, дату торгов.',
      en: 'An application is made for each lot separately. Open the lot page and read the terms: the description, the photos, the start price, the date of the sale.'
    }
  },
  {
    id: 'deposit',
    title: { ua: 'Внесіть гарантійний внесок', ru: 'Внесите гарантийный взнос', en: 'Pay the guarantee deposit' },
    text: {
      ua: 'Без внеску торгуватися не можна. Розмір і строки вказані в умовах лота; якщо ви не виграли, внесок повертають.',
      ru: 'Без взноса торговаться нельзя. Размер и сроки указаны в условиях лота; если вы не выиграли, взнос возвращают.',
      en: 'You cannot bid without it. The size and the deadline are in the lot terms; if you do not win, the deposit is returned.'
    }
  },
  {
    id: 'bid',
    title: { ua: 'Беріть участь у торгах', ru: 'Участвуйте в торгах', en: 'Bid' },
    text: {
      ua: 'Торги проходять покроково: нова ставка вища за попередню на крок аукціону. Якщо торги не відбулися, лот виставляють знову.',
      ru: 'Торги проходят пошагово: новая ставка выше предыдущей на шаг аукциона. Если торги не состоялись, лот выставляют снова.',
      en: 'Bidding goes in steps: a new bid beats the previous one by the auction step. If the sale fails, the lot is listed again.'
    }
  }
]

export const TAKE_NOTE: L10n = {
  ua: 'Ми не організатор торгів і не приймаємо заявок: тут лише дані та пояснення. Умови завжди перевіряйте на сторінці лота та в чинному Порядку.',
  ru: 'Мы не организатор торгов и не принимаем заявок: здесь только данные и пояснения. Условия всегда проверяйте на странице лота и в действующем Порядке.',
  en: 'We are not the organiser and take no applications: this is data and explanation only. Always check the terms on the lot page and in the current Procedure.'
}

export const WORLD_TITLE: L10n = {
  ua: 'Як це працює в інших країнах',
  ru: 'Как это работает в других странах',
  en: 'How it works elsewhere'
}

export const WORLD: Fact[] = [
  {
    id: 'us',
    title: { ua: 'США: державні торги', ru: 'США: государственные торги', en: 'USA: government sales' },
    text: {
      ua: 'Служба маршалів США продає майно, конфісковане за програмою Мін’юсту, зокрема авто, в онлайн-аукціонах через підрядних аукціоністів; GSA продає державні авто через торги (онлайн, очно або за заявкою поштою).',
      ru: 'Служба маршалов США продаёт имущество, конфискованное по программе Минюста, в том числе авто, в онлайн-аукционах через подрядных аукционистов; GSA продаёт государственные авто через торги (онлайн, очно или по заявке по почте).',
      en: 'The US Marshals Service sells assets seized under the Justice Department forfeiture programme, vehicles included, in online auctions run by contracted auctioneers; GSA sells government-owned vehicles by auction (online, in person or by mail-in bid).'
    }
  },
  {
    id: 'uk',
    title: { ua: 'Велика Британія: поліція', ru: 'Великобритания: полиция', en: 'UK: police' },
    text: {
      ua: 'Поліція продає вилучені чи знайдені авто, за якими ніхто не прийшов. Виручка йде насамперед на витрати з вилучення; майно, продане за Законом про майно поліції, потрапляє в окремий фонд.',
      ru: 'Полиция продаёт изъятые или найденные авто, за которыми никто не пришёл. Выручка идёт прежде всего на расходы по изъятию; имущество, проданное по Закону об имуществе полиции, попадает в отдельный фонд.',
      en: 'Police forces auction seized or recovered vehicles that nobody claims. Proceeds go first to the recovery costs; property sold under the Police Property Act goes to a separate Police Property Act Fund.'
    }
  },
  {
    id: 'salvage',
    title: { ua: 'Страхові salvage-аукціони', ru: 'Страховые salvage-аукционы', en: 'Insurance salvage auctions' },
    text: {
      ua: 'Це інший ринок: авто, списані страховиками, продають на онлайн-аукціонах, як-от Copart та IAA. Український лот СЕТАМ - арештоване майно будь-якого стану, часто звичайне вживане авто, а не обов’язково пошкоджене.',
      ru: 'Это другой рынок: авто, списанные страховщиками, продают на онлайн-аукционах, таких как Copart и IAA. Украинский лот СЕТАМ - арестованное имущество любого состояния, часто обычное подержанное авто, а не обязательно повреждённое.',
      en: 'This is a different market: cars written off by insurers are sold at online auctions such as Copart and IAA. A SETAM lot is seized property of any condition, often an ordinary used car, not necessarily a damaged one.'
    }
  }
]

export const WORLD_NOTE: L10n = {
  ua: 'Історію американських салон-аукціонів і сайти-архіви їхніх лотів дивіться в розділі «Історія аукціонів» на картці номера; ми лише даємо посилання, фото не копіюємо.',
  ru: 'Историю американских аукционов и сайты-архивы их лотов смотрите в разделе «История аукционов» на карточке номера; мы лишь даём ссылки, фото не копируем.',
  en: 'For American auctions and the archive sites that republish their lots, see the “Auction history” section on the plate card; we only link out and copy no photos.'
}

export const HISTORY_TITLE: L10n = {
  ua: 'Коротка історія аукціонів',
  ru: 'Краткая история аукционов',
  en: 'A short history of auctions'
}

export const HISTORY_INTRO: L10n = {
  ua: 'Продаж тому, хто дає більше, старший за автомобілі приблизно на дві з половиною тисячі років.',
  ru: 'Продажа тому, кто даёт больше, старше автомобилей примерно на две с половиной тысячи лет.',
  en: 'Selling to the highest bidder is about two and a half thousand years older than the car.'
}

export const HISTORY: TimelineItem[] = [
  {
    when: { ua: 'Близько 500 р. до н. е.', ru: 'Около 500 г. до н. э.', en: 'About 500 BC' },
    text: {
      ua: 'Найраніші відомі аукціони пов’язують із розповіддю Геродота про щорічні торги наречених у Вавилоні.',
      ru: 'Самые ранние известные аукционы связывают с рассказом Геродота о ежегодных торгах невест в Вавилоне.',
      en: 'The earliest recorded auctions are tied to Herodotus’s account of yearly marriage auctions in Babylon.'
    }
  },
  {
    when: { ua: '193 р.', ru: '193 г.', en: 'AD 193' },
    text: {
      ua: 'Преторіанці після вбивства імператора Пертінакса «продали» владу тому, хто дасть більше, - так прийшов до влади Дідій Юліан. Сума в джерелах спірна.',
      ru: 'Преторианцы после убийства императора Пертинакса «продали» власть тому, кто даст больше, - так пришёл к власти Дидий Юлиан. Сумма в источниках спорна.',
      en: 'After killing the emperor Pertinax, the Praetorian Guard offered the empire to the highest bidder, and Didius Julianus won. The sum quoted is disputed.'
    }
  },
  {
    when: { ua: '1744 і 1766', ru: '1744 и 1766', en: '1744 and 1766' },
    text: {
      ua: 'У Лондоні продаж бібліотеки під керівництвом Семюела Бейкера 11 березня 1744 року вважають початком Sotheby’s, а 1766 року Джеймс Крісті засновує Christie’s (рекламу його торгів знаходять уже з 1759-го).',
      ru: 'В Лондоне продажу библиотеки под руководством Сэмюэла Бейкера 11 марта 1744 года считают началом Sotheby’s, а в 1766 году Джеймс Кристи основывает Christie’s (рекламу его торгов находят уже с 1759-го).',
      en: 'In London a library sale run by Samuel Baker on 11 March 1744 is counted as the start of Sotheby’s, and in 1766 James Christie founds Christie’s (adverts for his sales have been found from 1759).'
    }
  },
  {
    when: { ua: '1982', ru: '1982', en: '1982' },
    text: {
      ua: 'У Каліфорнії з’являються перші великі майданчики для продажу списаних авто: за історіями компаній, і Copart, і IAA ведуть початок від 1982 року.',
      ru: 'В Калифорнии появляются первые крупные площадки для продажи списанных авто: по историям компаний, и Copart, и IAA ведут начало от 1982 года.',
      en: 'In California the first large yards for written-off cars appear: by their company histories, both Copart and IAA date from 1982.'
    }
  },
  {
    when: { ua: '2014', ru: '2014', en: '2014' },
    text: {
      ua: 'В Україні стартує пілотний проєкт електронних торгів арештованим майном, який веде державне підприємство СЕТАМ при Мін’юсті.',
      ru: 'В Украине стартует пилотный проект электронных торгов арестованным имуществом, который ведёт государственное предприятие СЕТАМ при Минюсте.',
      en: 'Ukraine starts a pilot of electronic auctions of seized property, run by the state enterprise SETAM of the Ministry of Justice.'
    }
  },
  {
    when: { ua: '1 вересня 2020', ru: '1 сентября 2020', en: '1 September 2020' },
    text: {
      ua: 'Мін’юст підписує наказ про продаж арештованого майна через Prozorro.Продажі: адміністратором стає державне підприємство Prozorro.Sale, підключаються понад 40 майданчиків, а СЕТАМ лишається організатором.',
      ru: 'Минюст подписывает приказ о продаже арестованного имущества через Prozorro.Продажи: администратором становится государственное предприятие Prozorro.Sale, подключаются более 40 площадок, а СЕТАМ остаётся организатором.',
      en: 'The Ministry of Justice signs an order to sell seized property through Prozorro.Sale: the state enterprise Prozorro.Sale becomes the administrator, more than 40 platforms connect, and SETAM stays the organiser.'
    }
  },
  {
    when: { ua: '2024', ru: '2024', en: '2024' },
    text: {
      ua: 'Законопроєкт № 11139 (зареєстровано 1 квітня 2024) пропонує перенести ці торги зі СЕТАМ на Prozorro.Sale. Станом на 31 жовтня 2026 на сайті Ради його статус - «очікує розгляду»; останній зафіксований етап - висновок комітету від 12 листопада 2024.',
      ru: 'Законопроект № 11139 (зарегистрирован 1 апреля 2024) предлагает перенести эти торги из СЕТАМ на Prozorro.Sale. По состоянию на 31 октября 2026 на сайте Рады его статус - «ожидает рассмотрения»; последний зафиксированный этап - заключение комитета от 12 ноября 2024.',
      en: 'Bill No. 11139 (registered 1 April 2024) proposes to move these auctions from SETAM to Prozorro.Sale. As of 31 October 2026 its card on the Verkhovna Rada site shows “awaiting consideration”; the last recorded stage is the committee report of 12 November 2024.'
    }
  }
]

export const HISTORY_NOTE: L10n = {
  ua: 'Дати з джерел нижче; про 193 рік і 1759-й історики не мають єдиної думки. Статус законопроєкту перевіряйте на сайті Верховної Ради.',
  ru: 'Даты из источников ниже; насчёт 193 года и 1759-го историки не имеют единого мнения. Статус законопроекта проверяйте на сайте Верховной Рады.',
  en: 'Dates are from the sources below; historians are not unanimous on AD 193 and on 1759. Check the status of the bill on the Verkhovna Rada site.'
}

export const CHECK_TITLE: L10n = {
  ua: 'Що перевірити перед купівлею',
  ru: 'Что проверить перед покупкой',
  en: 'What to check before you buy'
}

export const CHECKS: Fact[] = [
  {
    id: 'vin',
    title: { ua: 'VIN і документи', ru: 'VIN и документы', en: 'VIN and papers' },
    text: {
      ua: 'Звірте VIN на авто з документами й перегляньте історію реєстрацій. Номер у лоті може не збігатися з тим, що на авто.',
      ru: 'Сверьте VIN на авто с документами и просмотрите историю регистраций. Номер в лоте может не совпадать с тем, что на авто.',
      en: 'Match the VIN on the car with the papers and read the registration history. The plate in a lot may differ from the one on the car.'
    }
  },
  {
    id: 'price',
    title: {
      ua: 'Низька ціна не гарантує стану',
      ru: 'Низкая цена не гарантирует состояния',
      en: 'A low price proves nothing'
    },
    text: {
      ua: 'Стартова ціна часто нижча за ринкову, але авто бачили не всі учасники. Огляньте його, якщо організатор це дозволяє, і не покладайтеся лише на фото.',
      ru: 'Стартовая цена часто ниже рыночной, но авто видели не все участники. Осмотрите его, если организатор это позволяет, и не полагайтесь только на фото.',
      en: 'The start price is often below market, but not every bidder has seen the car. Inspect it if the organiser allows, and do not rely on photos alone.'
    }
  },
  {
    id: 'history',
    title: { ua: 'Не лише лот', ru: 'Не только лот', en: 'More than the lot' },
    text: {
      ua: 'Подивіться, чи не в розшуку номер чи авто, чи були інші лоти й чи ввезене авто з-за кордону.',
      ru: 'Посмотрите, не в розыске ли номер или авто, были ли другие лоты и ввезено ли авто из-за границы.',
      en: 'See whether the plate or the car is wanted, whether there were other lots, and whether the car was imported.'
    }
  }
]

export const SOURCES: Source[] = [
  {
    href: 'https://setam.net.ua/',
    title: { ua: 'СЕТАМ', ru: 'СЕТАМ', en: 'SETAM' },
    note: {
      ua: 'організатор торгів; умови й лоти',
      ru: 'организатор торгов; условия и лоты',
      en: 'the organiser; terms and lots'
    }
  },
  {
    href: 'https://zakon.rada.gov.ua/laws/show/z1301-16',
    title: {
      ua: 'Порядок реалізації арештованого майна',
      ru: 'Порядок реализации арестованного имущества',
      en: 'Procedure for selling seized property'
    },
    note: {
      ua: 'чинна редакція; суми й строки',
      ru: 'действующая редакция; суммы и сроки',
      en: 'current wording; sums and deadlines'
    }
  },
  {
    href: 'https://prozorro.sale/',
    title: { ua: 'Prozorro.Продажі', ru: 'Prozorro.Продажи', en: 'Prozorro.Sale' },
    note: {
      ua: 'система електронних торгів',
      ru: 'система электронных торгов',
      en: 'the electronic auction system'
    }
  },
  {
    href: 'https://data.gov.ua/dataset/eda4e3cf-0dda-46a1-a78a-ee264ebbfe97',
    title: { ua: 'Відкриті дані СЕТАМ', ru: 'Открытые данные СЕТАМ', en: 'SETAM open data' },
    note: {
      ua: 'ліцензія CC BY; звідси наші лоти',
      ru: 'лицензия CC BY; отсюда наши лоты',
      en: 'CC BY; where our lots come from'
    }
  },
  {
    href: 'https://en.wikipedia.org/wiki/Auction',
    title: { ua: 'Auction (Вікіпедія)', ru: 'Auction (Википедия)', en: 'Auction (Wikipedia)' },
    note: {
      ua: 'Вавилон, Рим, Sotheby’s, Christie’s',
      ru: 'Вавилон, Рим, Sotheby’s, Christie’s',
      en: 'Babylon, Rome, Sotheby’s, Christie’s'
    }
  },
  {
    href: 'https://www.referenceforbusiness.com/history2/74/Copart-Inc.html',
    title: { ua: 'Історія Copart', ru: 'История Copart', en: 'Copart history' },
    note: { ua: 'рік заснування', ru: 'год основания', en: 'founding year' }
  },
  {
    href: 'https://www.referenceforbusiness.com/history2/14/Insurance-Auto-Auctions-Inc.html',
    title: { ua: 'Історія IAA', ru: 'История IAA', en: 'IAA history' },
    note: { ua: 'рік заснування', ru: 'год основания', en: 'founding year' }
  }
]

export const SOURCES_NOTE: L10n = {
  ua: 'Факти зі США й Великої Британії - з сайтів Служби маршалів США, GSA та поліції (див. картку номера). Ми перевіряли їх 31.10.2026; правила змінюються, тож звіряйтеся з офіційним джерелом.',
  ru: 'Факты из США и Великобритании - с сайтов Службы маршалов США, GSA и полиции (см. карточку номера). Мы проверяли их 31.10.2026; правила меняются, так что сверяйтесь с официальным источником.',
  en: 'The US and UK facts come from the US Marshals Service, GSA and police sites (see the plate card). We checked them on 31 Oct 2026; rules change, so verify against the official source.'
}
