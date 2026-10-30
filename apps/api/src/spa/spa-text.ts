/** Server-side copy for link previews — the SPA's i18n bundles live in the web app, which the API can't import. */
export const LANGS = ['ua', 'ru', 'en'] as const
export type Lang = (typeof LANGS)[number]

export const DEFAULT_LANG: Lang = 'ua'

export const OG_LOCALE: Record<Lang, string> = { ua: 'uk_UA', ru: 'ru_RU', en: 'en_US' }

/** `?lang=` from a share link; anything unrecognized falls back to the default (crawlers send no language). */
export function resolveLang(raw: unknown): Lang {
  return (LANGS as readonly string[]).includes(raw as string) ? (raw as Lang) : DEFAULT_LANG
}

type PageText = { title: string; description: string }

export const SITE_NAME = 'Cars UA'

export const TAGLINE: Record<Lang, [string, string]> = {
  ua: ['Пошук авто за номером', 'або VIN-кодом'],
  ru: ['Поиск авто по номеру', 'или VIN-коду'],
  en: ['Find a car by plate', 'or VIN code']
}

/** Static routes: one entry per route, rendered once per language (and cached by the controller). */
export const STATIC_PAGES: Record<string, Record<Lang, PageText>> = {
  '/': {
    ua: {
      title: 'Перевірка авто за номером або VIN в Україні | Cars UA',
      description:
        'Пошук авто за номерним знаком або VIN-кодом: марка, модель, рік, паливо, регіон та історія реєстрацій. Відкриті дані реєстру України.'
    },
    ru: {
      title: 'Проверка авто по номеру или VIN в Украине | Cars UA',
      description:
        'Поиск авто по номерному знаку или VIN-коду: марка, модель, год, топливо, регион и история регистраций. Открытые данные реестра Украины.'
    },
    en: {
      title: 'Ukrainian car lookup by plate or VIN | Cars UA',
      description:
        "Look up a vehicle by Ukrainian plate number or VIN: make, model, year, fuel, region and registration history. Built on the state's open vehicle registry."
    }
  },
  '/about': {
    ua: {
      title: 'Про Cars UA: пошук авто на відкритих даних України',
      description:
        'Звідки дані (data.gov.ua), як працює пошук за номером і VIN та що таке Cars UA: сервіс на відкритих даних про транспортні засоби України.'
    },
    ru: {
      title: 'О Cars UA: поиск авто на открытых данных Украины',
      description:
        'Откуда данные (data.gov.ua), как работает поиск по номеру и VIN и что такое Cars UA: сервис на открытых данных о транспортных средствах Украины.'
    },
    en: {
      title: 'About Cars UA: car lookup on Ukrainian open data',
      description:
        'Where the data comes from (data.gov.ua), how plate and VIN search works, and what Cars UA is: a service built on open vehicle data from Ukraine.'
    }
  },
  '/install': {
    ua: {
      title: 'Cars UA - Встановлення застосунку',
      description:
        'Як встановити Cars UA на телефон чи комп’ютер, що працює офлайн, як оновити або видалити застосунок.'
    },
    ru: {
      title: 'Cars UA - Установка приложения',
      description:
        'Как установить Cars UA на телефон или компьютер, что работает офлайн, как обновить или удалить приложение.'
    },
    en: {
      title: 'Cars UA - Install the app',
      description:
        'How to install Cars UA on your phone or computer, what works offline, and how to update or remove it.'
    }
  },
  '/privacy': {
    ua: { title: 'Cars UA - Політика конфіденційності', description: 'Які дані ми зберігаємо і чого не збираємо.' },
    ru: { title: 'Cars UA - Политика конфиденциальности', description: 'Какие данные мы храним и чего не собираем.' },
    en: { title: 'Cars UA - Privacy policy', description: 'What data we keep and what we do not collect.' }
  },
  '/terms': {
    ua: { title: 'Cars UA - Умови користування', description: 'Правила користування сервісом Cars UA.' },
    ru: { title: 'Cars UA - Условия использования', description: 'Правила использования сервиса Cars UA.' },
    en: { title: 'Cars UA - Terms of use', description: 'The rules for using Cars UA.' }
  },
  '/history': {
    ua: { title: 'Cars UA - Історія пошуку', description: 'Ваші останні пошуки за номером і VIN.' },
    ru: { title: 'Cars UA - История поиска', description: 'Ваши последние поиски по номеру и VIN.' },
    en: { title: 'Cars UA - Search history', description: 'Your recent plate and VIN searches.' }
  },
  '/favorites': {
    ua: { title: 'Cars UA - Обране', description: 'Збережені вами автомобілі.' },
    ru: { title: 'Cars UA - Избранное', description: 'Сохранённые вами автомобили.' },
    en: { title: 'Cars UA - Favorites', description: 'Vehicles you saved.' }
  },
  '/stats': {
    ua: {
      title: 'Статистика авто в Україні: марки, кольори, паливо | Cars UA',
      description:
        'Найпопулярніші марки, кольори, паливо та регіони за відкритим реєстром транспортних засобів України. Дані з data.gov.ua.'
    },
    ru: {
      title: 'Статистика авто в Украине: марки, цвета, топливо | Cars UA',
      description:
        'Самые популярные марки, цвета, топливо и регионы по открытому реестру транспортных средств Украины. Данные с data.gov.ua.'
    },
    en: {
      title: 'Ukraine car statistics: makes, colours, fuels | Cars UA',
      description:
        "Most common makes, colours, fuels and regions in Ukraine's open vehicle registry. Data from data.gov.ua."
    }
  },
  '/wanted': {
    ua: {
      title: 'Авто в розшуку в Україні: статистика за регіонами і марками | Cars UA',
      description: 'Скільки авто в розшуку в Україні, скільки знайдено, за регіонами, марками, кольорами та роками.'
    },
    ru: {
      title: 'Авто в розыске в Украине: статистика по регионам и маркам | Cars UA',
      description: 'Сколько авто в розыске в Украине, сколько найдено, по регионам, маркам, цветам и годам.'
    },
    en: {
      title: 'Wanted vehicles in Ukraine: statistics by region and make | Cars UA',
      description: 'How many vehicles are wanted in Ukraine and how many were found, by region, make, colour and year.'
    }
  },
  '/fuel': {
    ua: {
      title: 'Витрата пального та викиди CO₂ авто за марками й моделями | Cars UA',
      description:
        'Витрата пального та викиди CO₂ за марками й моделями авто, які їздять в Україні, за відкритим реєстром транспортних засобів.'
    },
    ru: {
      title: 'Расход топлива и выбросы CO₂ авто по маркам и моделям | Cars UA',
      description:
        'Расход топлива и выбросы CO₂ по маркам и моделям авто, которые ездят в Украине, по открытому реестру транспортных средств.'
    },
    en: {
      title: 'Car fuel economy and CO₂ emissions by make and model | Cars UA',
      description:
        'Fuel economy and CO₂ emissions by make and model for the cars driving in Ukraine, from the open vehicle registry.'
    }
  },
  '/safety': {
    ua: {
      title: 'Краш-тести авто: оцінки Euro NCAP, IIHS, NHTSA за моделями | Cars UA',
      description:
        'Результати краш-тестів Euro NCAP, IIHS, NHTSA та інших за марками й моделями авто, які їздять в Україні.'
    },
    ru: {
      title: 'Краш-тесты авто: оценки Euro NCAP, IIHS, NHTSA по моделям | Cars UA',
      description:
        'Результаты краш-тестов Euro NCAP, IIHS, NHTSA и других по маркам и моделям авто, которые ездят в Украине.'
    },
    en: {
      title: 'Car crash tests: Euro NCAP, IIHS, NHTSA ratings by model | Cars UA',
      description:
        'Euro NCAP, IIHS, NHTSA and other crash-test results by make and model for the cars driving in Ukraine.'
    }
  },
  '/releases': {
    ua: { title: 'Cars UA - Що нового', description: 'Історія змін Cars UA за днями: можливості, покращення, дані.' },
    ru: {
      title: 'Cars UA - Что нового',
      description: 'История изменений Cars UA по дням: возможности, улучшения, данные.'
    },
    en: {
      title: 'Cars UA - What’s new',
      description: 'A day-by-day log of Cars UA changes: features, improvements, data.'
    }
  },
  '/read': {
    ua: {
      title: 'Довідник авто: типи кузова, розміри й класи, електромобілі | Cars UA',
      description:
        'Авто простими словами на даних українського реєстру: типи кузова, розміри й класи, електромобілі, номерні знаки, реальні приклади.'
    },
    ru: {
      title: 'Справочник авто: типы кузова, размеры и классы, электромобили | Cars UA',
      description:
        'Авто простыми словами на данных украинского реестра: типы кузова, размеры и классы, электромобили, номерные знаки, реальные примеры.'
    },
    en: {
      title: 'Car guides: body types, sizes and classes, electric cars | Cars UA',
      description:
        'Cars explained on Ukrainian registry data: body types, sizes and classes, electric cars, number plates, real examples.'
    }
  },
  '/read/body-types': {
    ua: {
      title: 'Cars UA - Типи кузова авто',
      description:
        'Седан, хетчбек, універсал, SUV чи кросовер: чим вони відрізняються, з реальними прикладами з українського реєстру.'
    },
    ru: {
      title: 'Cars UA - Типы кузова авто',
      description:
        'Седан, хэтчбек, универсал, SUV или кроссовер: чем они отличаются, с реальными примерами из украинского реестра.'
    },
    en: {
      title: 'Cars UA - Car body types',
      description:
        'Sedan, hatchback, estate, SUV or crossover: how they differ, with real examples from the Ukrainian registry.'
    }
  },
  '/read/sizes': {
    ua: {
      title: 'Cars UA - Розміри та класи авто',
      description: 'Класи A, B, C, D, J, M за довжиною, чи влізе авто в паркомісце, пошук моделей за розміром.'
    },
    ru: {
      title: 'Cars UA - Размеры и классы авто',
      description: 'Классы A, B, C, D, J, M по длине, влезет ли авто на парковочное место, поиск моделей по размеру.'
    },
    en: {
      title: 'Cars UA - Car sizes and classes',
      description: 'The A, B, C, D, J and M classes by length, whether a car fits a parking space, and a size explorer.'
    }
  },
  '/read/fleet': {
    ua: {
      title: 'Cars UA - Що їздить Україною: кольори, паливо, вік',
      description: 'Найпопулярніші кольори, паливо та роки реєстрації авто в Україні - на даних відкритого реєстру.'
    },
    ru: {
      title: 'Cars UA - Что ездит по Украине: цвета, топливо, возраст',
      description: 'Самые популярные цвета, топливо и годы регистрации авто в Украине - на данных открытого реестра.'
    },
    en: {
      title: 'Cars UA - What Ukraine drives: colours, fuel, fleet age',
      description: 'The most common colours, fuels and registration years of cars in Ukraine, from the open registry.'
    }
  },
  '/read/plates': {
    ua: {
      title: 'Cars UA - Номерні знаки України: коди регіонів і формати',
      description:
        'З чого складається номер, які літери означають який регіон, старі й нові формати та номери без регіону.'
    },
    ru: {
      title: 'Cars UA - Номерные знаки Украины: коды регионов и форматы',
      description:
        'Из чего состоит номер, какие буквы означают какой регион, старые и новые форматы и номера без региона.'
    },
    en: {
      title: 'Cars UA - Ukrainian number plates: region codes and formats',
      description:
        'What a plate is made of, which letters mean which region, the old and new formats, and plates with no region.'
    }
  },
  '/read/generations': {
    ua: {
      title: 'Cars UA - Як авто росли за поколіннями: Octavia, Golf, Camry',
      description:
        'Довжина, ширина й колісна база кожного покоління популярних моделей - наскільки «Гольф» і «Октавія» виросли за десятиліття.'
    },
    ru: {
      title: 'Cars UA - Как авто росли по поколениям: Octavia, Golf, Camry',
      description:
        'Длина, ширина и колёсная база каждого поколения популярных моделей - насколько «Гольф» и «Октавия» выросли за десятилетия.'
    },
    en: {
      title: 'Cars UA - How cars grew across generations: Octavia, Golf, Camry',
      description:
        'Length, width and wheelbase of every generation of popular models - how much the Golf and the Octavia grew over the decades.'
    }
  },
  '/read/electric': {
    ua: {
      title: 'Cars UA - Електромобілі в Україні: роки, регіони, моделі, зарядка',
      description:
        'Скільки в Україні електромобілів і гібридів, з яких років, де їх найбільше, які моделі лідирують і чим відрізняються роз’єми зарядки.'
    },
    ru: {
      title: 'Cars UA - Электромобили в Украине: годы, регионы, модели, зарядка',
      description:
        'Сколько в Украине электромобилей и гибридов, каких лет, где их больше всего, какие модели лидируют и чем отличаются разъёмы зарядки.'
    },
    en: {
      title: 'Cars UA - Electric cars in Ukraine: years, regions, models, charging',
      description:
        'How many electric cars and hybrids Ukraine has, which years they are from, where they are, which models lead and how the charging plugs differ.'
    }
  },
  '/read/imports': {
    ua: {
      title: 'Cars UA - Авто з-за кордону: ввезені та куплені через дилера, країна за VIN',
      description:
        'Скільки авто ввезено з-за кордону й скільки куплено через дилера, які моделі ввозять найчастіше, що VIN каже про країну виробництва і що перевірити перед купівлею.'
    },
    ru: {
      title: 'Cars UA - Авто из-за границы: ввезённые и купленные через дилера, страна по VIN',
      description:
        'Сколько авто ввезено из-за границы и сколько куплено через дилера, какие модели ввозят чаще всего, что VIN говорит о стране сборки и что проверить перед покупкой.'
    },
    en: {
      title: 'Cars UA - Cars from abroad: imports vs dealer-bought, country by VIN',
      description:
        'How many cars were brought in from abroad and how many bought through a dealer, which models are imported most, what the VIN says about the country of build and what to check before buying.'
    }
  },
  '/read/safety': {
    ua: {
      title: 'Cars UA - Краш-тести: оцінки безпеки авто в Україні за роками й моделями',
      description:
        'Які авто в Україні мають оцінки Euro NCAP, IIHS, JNCAP, C-NCAP і KNCAP, як вони змінюються за роками випуску, які моделі найкращі та найслабші і чого ці оцінки не кажуть.'
    },
    ru: {
      title: 'Cars UA - Краш-тесты: оценки безопасности авто в Украине по годам и моделям',
      description:
        'Какие авто в Украине имеют оценки Euro NCAP, IIHS, JNCAP, C-NCAP и KNCAP, как они меняются по годам выпуска, какие модели лучшие и слабейшие и о чём эти оценки не говорят.'
    },
    en: {
      title: 'Cars UA - Crash tests: car safety ratings in Ukraine by year and model',
      description:
        'Which cars in Ukraine have Euro NCAP, IIHS, JNCAP, C-NCAP and KNCAP ratings, how they change with the model year, which models are the best and the weakest, and what the ratings do not tell you.'
    }
  },
  '/read/fuel': {
    ua: {
      title: 'Cars UA - Паливо й викиди CO₂: на чому їздить Україна, чисті та витратні моделі',
      description:
        'Бензин, дизель, газ, гібрид чи електро: на чому їздить Україна, скільки CO₂ викидає середнє авто, як це змінюється за роками випуску, які моделі найчистіші та найвитратніші і як ми оцінюємо викиди.'
    },
    ru: {
      title: 'Cars UA - Топливо и выбросы CO₂: на чём ездит Украина, чистые и затратные модели',
      description:
        'Бензин, дизель, газ, гибрид или электро: на чём ездит Украина, сколько CO₂ выбрасывает среднее авто, как это меняется по годам выпуска, какие модели самые чистые и самые затратные и как мы оцениваем выбросы.'
    },
    en: {
      title: 'Cars UA - Fuel and CO₂ emissions: what Ukraine runs on, cleanest and thirstiest models',
      description:
        'Petrol, diesel, gas, hybrid or electric: what Ukraine runs on, how much CO₂ the average car emits, how it changes with the model year, which models are the cleanest and the most CO₂-heavy, and how we estimate emissions.'
    }
  },
  '/read/extremes': {
    ua: {
      title: 'Cars UA - Найважчі, найлегші й найпотужніші моделі авто в Україні',
      description:
        'Рекордсмени українського реєстру: яка модель найважча і найлегша, хто найпотужніший, має найбільший двигун, найвищий чи найдовший кузов і найбільший бак - та як читати ці рейтинги.'
    },
    ru: {
      title: 'Cars UA - Самые тяжёлые, лёгкие и мощные модели авто в Украине',
      description:
        'Рекордсмены украинского реестра: какая модель самая тяжёлая и лёгкая, кто самый мощный, с самым большим двигателем, самым высоким или длинным кузовом и самым большим баком - и как читать эти рейтинги.'
    },
    en: {
      title: 'Cars UA - Heaviest, lightest and most powerful car models in Ukraine',
      description:
        'The Ukrainian registry’s record holders: which model is the heaviest and the lightest, the most powerful, with the biggest engine, the tallest or longest body and the largest fuel tank, and how to read these rankings.'
    }
  },
  '/read/recalls': {
    ua: {
      title: 'Cars UA - Відкликання авто і типові несправності моделей',
      description:
        'Що таке відкликання, чим воно відрізняється від типової несправності, скільки кампаній мають популярні моделі в ЄС, США й Канаді і що найчастіше ламається з пробігом за даними техогляду.'
    },
    ru: {
      title: 'Cars UA - Отзывы авто и типичные неисправности моделей',
      description:
        'Что такое отзыв, чем он отличается от типичной неисправности, сколько кампаний у популярных моделей в ЕС, США и Канаде и что чаще всего ломается с пробегом по данным техосмотра.'
    },
    en: {
      title: 'Cars UA - Car recalls and common faults by model',
      description:
        'What a recall is, how it differs from a common fault, how many campaigns popular models have in the EU, US and Canada, and what most often fails as mileage grows according to inspection data.'
    }
  },
  '/read/vin': {
    ua: {
      title: 'Cars UA - VIN-код: що означають 17 символів, рік випуску і де його знайти',
      description:
        'З чого складається VIN, як за ним дізнатися виробника, країну й модельний рік, що таке контрольна цифра, історію VIN, де його знайти на авто, старі й радянські номери, чому VIN не розбирається і як шукати за ним.'
    },
    ru: {
      title: 'Cars UA - VIN-код: что значат 17 символов, год выпуска и где его найти',
      description:
        'Из чего состоит VIN, как по нему узнать производителя, страну и модельный год, что такое контрольная цифра, историю VIN, где его найти на авто, старые и советские номера, почему VIN не разбирается и как искать по нему.'
    },
    en: {
      title: 'Cars UA - VIN explained: what the 17 characters mean, the model year and where to find it',
      description:
        'What a VIN is made of, how to read the maker, country and model year off it, what the check digit is, the history of the VIN, where to find it on a car, old and Soviet-era numbers, why a VIN may not decode and how to search by it.'
    }
  },
  '/features': {
    ua: { title: 'Cars UA - Функції', description: 'Що ми створюємо для користувачів з обліковим записом.' },
    ru: { title: 'Cars UA - Функции', description: 'Что мы создаём для пользователей с учётной записью.' },
    en: { title: 'Cars UA - Features', description: 'What we are building for signed-in users.' }
  },
  '/news': {
    ua: { title: 'Cars UA - Автоновини', description: 'Свіжі автоновини з українських та світових видань.' },
    ru: { title: 'Cars UA - Автоновости', description: 'Свежие автоновости из украинских и мировых изданий.' },
    en: { title: 'Cars UA - Auto news', description: 'Fresh car news from Ukrainian and international outlets.' }
  },
  '/discuss': {
    ua: { title: 'Cars UA - Обговорення', description: 'Відгуки, ідеї та питання про Cars UA.' },
    ru: { title: 'Cars UA - Обсуждение', description: 'Отзывы, идеи и вопросы о Cars UA.' },
    en: { title: 'Cars UA - Discuss', description: 'Feedback, ideas and questions about Cars UA.' }
  },
  '/play': {
    ua: {
      title: 'Cars UA - Ігри',
      description: 'Вгадай область за номером, марку за логотипом та «більше чи менше» за даними реєстру.'
    },
    ru: {
      title: 'Cars UA - Игры',
      description: 'Угадай область по номеру, марку по логотипу и «больше или меньше» по данным реестра.'
    },
    en: {
      title: 'Cars UA - Games',
      description: 'Guess the region from a plate, the brand from a logo, and higher or lower on registry counts.'
    }
  },
  '/race': {
    ua: {
      title: 'Cars UA - Тест-драйв',
      description: 'Безкоштовна гра: проїдьтесь на седані, хетчбеку, позашляховику та іншому.'
    },
    ru: {
      title: 'Cars UA - Тест-драйв',
      description: 'Бесплатная игра: прокатитесь на седане, хэтчбеке, внедорожнике и другом.'
    },
    en: {
      title: 'Cars UA - Test drive',
      description: 'A free racing game: take a sedan, hatchback, SUV or anything else for a spin.'
    }
  },
  '/relax': {
    ua: { title: 'Cars UA - Релакс', description: 'Живий фон: карта, Земля з космосу, трафік та місто.' },
    ru: { title: 'Cars UA - Релакс', description: 'Живой фон: карта, Земля из космоса, трафик и город.' },
    en: { title: 'Cars UA - Relax', description: 'A live backdrop: map, Earth from space, traffic and city.' }
  },
  '/advanced-search': {
    ua: {
      title: 'Cars UA - Розширений пошук',
      description: 'Пошук авто за маркою, моделлю, роком, кольором, паливом та регіоном.'
    },
    ru: {
      title: 'Cars UA - Расширенный поиск',
      description: 'Поиск авто по марке, модели, году, цвету, топливу и региону.'
    },
    en: {
      title: 'Cars UA - Advanced search',
      description: 'Search vehicles by make, model, year, color, fuel and region.'
    }
  }
}

const REGISTRY_NOTE: Record<Lang, string> = {
  ua: 'Дані з державного реєстру транспортних засобів.',
  ru: 'Данные из государственного реестра транспортных средств.',
  en: 'Data from the state open vehicle registry.'
}

const UNKNOWN_VEHICLE: Record<Lang, string> = { ua: 'авто', ru: 'авто', en: 'vehicle' }

const VALUE_NOTE: Record<Lang, (range: string) => string> = {
  ua: range =>
    `Орієнтовна вартість в ЄС: ${range}. Груба оцінка від нової ціни в Нідерландах, не ринкова ціна в Україні.`,
  ru: range =>
    `Ориентировочная стоимость в ЕС: ${range}. Грубая оценка от новой цены в Нидерландах, не рыночная цена в Украине.`,
  en: range => `Estimated EU value: ${range}. A rough estimate from the Dutch new price, not a Ukrainian market price.`
}

/** `?section=value` share link: the plate text with the estimated-value range put first. */
export function valuePageText(lang: Lang, base: PageText, lowEur: number, highEur: number): PageText {
  const fmt = (n: number): string => n.toLocaleString('en-US')
  return {
    title: base.title,
    description: `${VALUE_NOTE[lang](`~€${fmt(lowEur)}–${fmt(highEur)}`)} ${base.description}`
  }
}

type Facts = { value: string; car: string | null; year: string | null; extra: Array<string | null | undefined> }

/** Title/description for a plate or VIN page — "Cars UA - AA1234BB - Toyota Camry 2015". */
export function vehiclePageText(lang: Lang, f: Facts, kind: 'plate' | 'vin'): PageText {
  const year = f.year ? ` ${f.year}` : ''
  const facts = [f.car, f.year, ...f.extra].filter(Boolean).join(', ')
  const note = kind === 'vin' ? `${REGISTRY_NOTE[lang]} NHTSA vPIC.` : REGISTRY_NOTE[lang]
  return {
    title: `${SITE_NAME} - ${f.value} - ${f.car ?? UNKNOWN_VEHICLE[lang]}${year}`,
    description: `${kind === 'vin' ? 'VIN ' : ''}${f.value}${facts ? `: ${facts}` : ''}. ${note}`
  }
}
