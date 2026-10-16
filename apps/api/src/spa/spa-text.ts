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
      title: 'Cars UA — номери та VIN',
      description: 'Пошук даних про транспортний засіб за номерним знаком або VIN-кодом. Відкриті дані реєстру України.'
    },
    ru: {
      title: 'Cars UA — номера и VIN',
      description:
        'Поиск данных о транспортном средстве по номерному знаку или VIN-коду. Открытые данные реестра Украины.'
    },
    en: {
      title: 'Cars UA — plates & VIN',
      description: "Look up a vehicle by Ukrainian plate number or VIN. Built on the state's open vehicle registry."
    }
  },
  '/about': {
    ua: { title: 'Про сервіс · Cars UA', description: 'Звідки дані, як працює пошук і що таке Cars UA.' },
    ru: { title: 'О сервисе · Cars UA', description: 'Откуда данные, как работает поиск и что такое Cars UA.' },
    en: { title: 'About · Cars UA', description: 'Where the data comes from, how search works, and what Cars UA is.' }
  },
  '/install': {
    ua: {
      title: 'Встановлення застосунку · Cars UA',
      description:
        'Як встановити Cars UA на телефон чи комп’ютер, що працює офлайн, як оновити або видалити застосунок.'
    },
    ru: {
      title: 'Установка приложения · Cars UA',
      description:
        'Как установить Cars UA на телефон или компьютер, что работает офлайн, как обновить или удалить приложение.'
    },
    en: {
      title: 'Install the app · Cars UA',
      description:
        'How to install Cars UA on your phone or computer, what works offline, and how to update or remove it.'
    }
  },
  '/privacy': {
    ua: { title: 'Політика конфіденційності · Cars UA', description: 'Які дані ми зберігаємо і чого не збираємо.' },
    ru: { title: 'Политика конфиденциальности · Cars UA', description: 'Какие данные мы храним и чего не собираем.' },
    en: { title: 'Privacy policy · Cars UA', description: 'What data we keep and what we do not collect.' }
  },
  '/terms': {
    ua: { title: 'Умови користування · Cars UA', description: 'Правила користування сервісом Cars UA.' },
    ru: { title: 'Условия использования · Cars UA', description: 'Правила использования сервиса Cars UA.' },
    en: { title: 'Terms of use · Cars UA', description: 'The rules for using Cars UA.' }
  },
  '/history': {
    ua: { title: 'Історія пошуку · Cars UA', description: 'Ваші останні пошуки за номером і VIN.' },
    ru: { title: 'История поиска · Cars UA', description: 'Ваши последние поиски по номеру и VIN.' },
    en: { title: 'Search history · Cars UA', description: 'Your recent plate and VIN searches.' }
  },
  '/favorites': {
    ua: { title: 'Обране · Cars UA', description: 'Збережені вами автомобілі.' },
    ru: { title: 'Избранное · Cars UA', description: 'Сохранённые вами автомобили.' },
    en: { title: 'Favorites · Cars UA', description: 'Vehicles you saved.' }
  },
  '/stats': {
    ua: {
      title: 'Статистика · Cars UA',
      description: 'Найпопулярніші марки, кольори, паливо та регіони за реєстром транспортних засобів України.'
    },
    ru: {
      title: 'Статистика · Cars UA',
      description: 'Самые популярные марки, цвета, топливо и регионы по реестру транспортных средств Украины.'
    },
    en: {
      title: 'Statistics · Cars UA',
      description: "Most common makes, colors, fuels and regions in Ukraine's vehicle registry."
    }
  },
  '/fuel': {
    ua: {
      title: 'Пальне та викиди · Cars UA',
      description: 'Витрата пального та викиди CO₂ за марками й моделями за реєстром України.'
    },
    ru: {
      title: 'Топливо и выбросы · Cars UA',
      description: 'Расход топлива и выбросы CO₂ по маркам и моделям по реестру Украины.'
    },
    en: {
      title: 'Fuel & emissions · Cars UA',
      description: "Fuel economy and CO₂ emissions by make and model, from Ukraine's vehicle registry."
    }
  },
  '/safety': {
    ua: {
      title: 'Безпека в ДТП · Cars UA',
      description: 'Результати краш-тестів Euro NCAP, IIHS, NHTSA та інших за марками й моделями.'
    },
    ru: {
      title: 'Безопасность в ДТП · Cars UA',
      description: 'Результаты краш-тестов Euro NCAP, IIHS, NHTSA и других по маркам и моделям.'
    },
    en: {
      title: 'Crash safety · Cars UA',
      description: 'Euro NCAP, IIHS, NHTSA and other crash-test results by make and model.'
    }
  },
  '/releases': {
    ua: { title: 'Що нового · Cars UA', description: 'Історія змін Cars UA за днями: можливості, покращення, дані.' },
    ru: {
      title: 'Что нового · Cars UA',
      description: 'История изменений Cars UA по дням: возможности, улучшения, данные.'
    },
    en: {
      title: 'What’s new · Cars UA',
      description: 'A day-by-day log of Cars UA changes: features, improvements, data.'
    }
  },
  '/read': {
    ua: {
      title: 'Довідник · Cars UA',
      description:
        'Авто простими словами на даних українського реєстру: типи кузова, розміри й класи, реальні приклади.'
    },
    ru: {
      title: 'Справочник · Cars UA',
      description:
        'Авто простыми словами на данных украинского реестра: типы кузова, размеры и классы, реальные примеры.'
    },
    en: {
      title: 'Guides · Cars UA',
      description: 'Cars explained on Ukrainian registry data: body types, sizes and classes, real examples.'
    }
  },
  '/read/body-types': {
    ua: {
      title: 'Типи кузова авто · Cars UA',
      description:
        'Седан, хетчбек, універсал, SUV чи кросовер: чим вони відрізняються, з реальними прикладами з українського реєстру.'
    },
    ru: {
      title: 'Типы кузова авто · Cars UA',
      description:
        'Седан, хэтчбек, универсал, SUV или кроссовер: чем они отличаются, с реальными примерами из украинского реестра.'
    },
    en: {
      title: 'Car body types · Cars UA',
      description:
        'Sedan, hatchback, estate, SUV or crossover: how they differ, with real examples from the Ukrainian registry.'
    }
  },
  '/read/sizes': {
    ua: {
      title: 'Розміри та класи авто · Cars UA',
      description: 'Класи A, B, C, D, J, M за довжиною, чи влізе авто в паркомісце, пошук моделей за розміром.'
    },
    ru: {
      title: 'Размеры и классы авто · Cars UA',
      description: 'Классы A, B, C, D, J, M по длине, влезет ли авто на парковочное место, поиск моделей по размеру.'
    },
    en: {
      title: 'Car sizes and classes · Cars UA',
      description: 'The A, B, C, D, J and M classes by length, whether a car fits a parking space, and a size explorer.'
    }
  },
  '/read/fleet': {
    ua: {
      title: 'Що їздить Україною: кольори, паливо, вік · Cars UA',
      description: 'Найпопулярніші кольори, паливо та роки реєстрації авто в Україні — на даних відкритого реєстру.'
    },
    ru: {
      title: 'Что ездит по Украине: цвета, топливо, возраст · Cars UA',
      description: 'Самые популярные цвета, топливо и годы регистрации авто в Украине — на данных открытого реестра.'
    },
    en: {
      title: 'What Ukraine drives: colours, fuel, fleet age · Cars UA',
      description: 'The most common colours, fuels and registration years of cars in Ukraine, from the open registry.'
    }
  },
  '/read/plates': {
    ua: {
      title: 'Номерні знаки України: коди регіонів і формати · Cars UA',
      description:
        'З чого складається номер, які літери означають який регіон, старі й нові формати та номери без регіону.'
    },
    ru: {
      title: 'Номерные знаки Украины: коды регионов и форматы · Cars UA',
      description:
        'Из чего состоит номер, какие буквы означают какой регион, старые и новые форматы и номера без региона.'
    },
    en: {
      title: 'Ukrainian number plates: region codes and formats · Cars UA',
      description:
        'What a plate is made of, which letters mean which region, the old and new formats, and plates with no region.'
    }
  },
  '/read/generations': {
    ua: {
      title: 'Як авто росли за поколіннями: Octavia, Golf, Camry · Cars UA',
      description:
        'Довжина, ширина й колісна база кожного покоління популярних моделей — наскільки «Гольф» і «Октавія» виросли за десятиліття.'
    },
    ru: {
      title: 'Как авто росли по поколениям: Octavia, Golf, Camry · Cars UA',
      description:
        'Длина, ширина и колёсная база каждого поколения популярных моделей — насколько «Гольф» и «Октавия» выросли за десятилетия.'
    },
    en: {
      title: 'How cars grew across generations: Octavia, Golf, Camry · Cars UA',
      description:
        'Length, width and wheelbase of every generation of popular models — how much the Golf and the Octavia grew over the decades.'
    }
  },
  '/read/electric': {
    ua: {
      title: 'Електромобілі в Україні: роки, регіони, моделі, зарядка · Cars UA',
      description:
        'Скільки в Україні електромобілів і гібридів, з яких років, де їх найбільше, які моделі лідирують і чим відрізняються роз’єми зарядки.'
    },
    ru: {
      title: 'Электромобили в Украине: годы, регионы, модели, зарядка · Cars UA',
      description:
        'Сколько в Украине электромобилей и гибридов, каких лет, где их больше всего, какие модели лидируют и чем отличаются разъёмы зарядки.'
    },
    en: {
      title: 'Electric cars in Ukraine: years, regions, models, charging · Cars UA',
      description:
        'How many electric cars and hybrids Ukraine has, which years they are from, where they are, which models lead and how the charging plugs differ.'
    }
  },
  '/read/imports': {
    ua: {
      title: 'Авто з-за кордону: ввезені та куплені через дилера, країна за VIN · Cars UA',
      description:
        'Скільки авто ввезено з-за кордону й скільки куплено через дилера, які моделі ввозять найчастіше, що VIN каже про країну виробництва і що перевірити перед купівлею.'
    },
    ru: {
      title: 'Авто из-за границы: ввезённые и купленные через дилера, страна по VIN · Cars UA',
      description:
        'Сколько авто ввезено из-за границы и сколько куплено через дилера, какие модели ввозят чаще всего, что VIN говорит о стране сборки и что проверить перед покупкой.'
    },
    en: {
      title: 'Cars from abroad: imports vs dealer-bought, country by VIN · Cars UA',
      description:
        'How many cars were brought in from abroad and how many bought through a dealer, which models are imported most, what the VIN says about the country of build and what to check before buying.'
    }
  },
  '/read/safety': {
    ua: {
      title: 'Краш-тести: оцінки безпеки авто в Україні за роками й моделями · Cars UA',
      description:
        'Які авто в Україні мають оцінки Euro NCAP, IIHS, JNCAP, C-NCAP і KNCAP, як вони змінюються за роками випуску, які моделі найкращі та найслабші і чого ці оцінки не кажуть.'
    },
    ru: {
      title: 'Краш-тесты: оценки безопасности авто в Украине по годам и моделям · Cars UA',
      description:
        'Какие авто в Украине имеют оценки Euro NCAP, IIHS, JNCAP, C-NCAP и KNCAP, как они меняются по годам выпуска, какие модели лучшие и слабейшие и о чём эти оценки не говорят.'
    },
    en: {
      title: 'Crash tests: car safety ratings in Ukraine by year and model · Cars UA',
      description:
        'Which cars in Ukraine have Euro NCAP, IIHS, JNCAP, C-NCAP and KNCAP ratings, how they change with the model year, which models are the best and the weakest, and what the ratings do not tell you.'
    }
  },
  '/read/fuel': {
    ua: {
      title: 'Паливо й викиди CO₂: на чому їздить Україна, чисті та витратні моделі · Cars UA',
      description:
        'Бензин, дизель, газ, гібрид чи електро: на чому їздить Україна, скільки CO₂ викидає середнє авто, як це змінюється за роками випуску, які моделі найчистіші та найвитратніші і як ми оцінюємо викиди.'
    },
    ru: {
      title: 'Топливо и выбросы CO₂: на чём ездит Украина, чистые и затратные модели · Cars UA',
      description:
        'Бензин, дизель, газ, гибрид или электро: на чём ездит Украина, сколько CO₂ выбрасывает среднее авто, как это меняется по годам выпуска, какие модели самые чистые и самые затратные и как мы оцениваем выбросы.'
    },
    en: {
      title: 'Fuel and CO₂ emissions: what Ukraine runs on, cleanest and thirstiest models · Cars UA',
      description:
        'Petrol, diesel, gas, hybrid or electric: what Ukraine runs on, how much CO₂ the average car emits, how it changes with the model year, which models are the cleanest and the most CO₂-heavy, and how we estimate emissions.'
    }
  },
  '/features': {
    ua: { title: 'Функції · Cars UA', description: 'Що ми створюємо для користувачів з обліковим записом.' },
    ru: { title: 'Функции · Cars UA', description: 'Что мы создаём для пользователей с учётной записью.' },
    en: { title: 'Features · Cars UA', description: 'What we are building for signed-in users.' }
  },
  '/news': {
    ua: { title: 'Автоновини · Cars UA', description: 'Свіжі автоновини з українських та світових видань.' },
    ru: { title: 'Автоновости · Cars UA', description: 'Свежие автоновости из украинских и мировых изданий.' },
    en: { title: 'Auto news · Cars UA', description: 'Fresh car news from Ukrainian and international outlets.' }
  },
  '/discuss': {
    ua: { title: 'Обговорення · Cars UA', description: 'Відгуки, ідеї та питання про Cars UA.' },
    ru: { title: 'Обсуждение · Cars UA', description: 'Отзывы, идеи и вопросы о Cars UA.' },
    en: { title: 'Discuss · Cars UA', description: 'Feedback, ideas and questions about Cars UA.' }
  },
  '/race': {
    ua: {
      title: 'Тест-драйв · Cars UA',
      description: 'Безкоштовна гра: проїдьтесь на седані, хетчбеку, позашляховику та іншому.'
    },
    ru: {
      title: 'Тест-драйв · Cars UA',
      description: 'Бесплатная игра: прокатитесь на седане, хэтчбеке, внедорожнике и другом.'
    },
    en: {
      title: 'Test drive · Cars UA',
      description: 'A free racing game: take a sedan, hatchback, SUV or anything else for a spin.'
    }
  },
  '/relax': {
    ua: { title: 'Релакс · Cars UA', description: 'Живий фон: карта, Земля з космосу, трафік та місто.' },
    ru: { title: 'Релакс · Cars UA', description: 'Живой фон: карта, Земля из космоса, трафик и город.' },
    en: { title: 'Relax · Cars UA', description: 'A live backdrop: map, Earth from space, traffic and city.' }
  },
  '/advanced-search': {
    ua: {
      title: 'Розширений пошук · Cars UA',
      description: 'Пошук авто за маркою, моделлю, роком, кольором, паливом та регіоном.'
    },
    ru: {
      title: 'Расширенный поиск · Cars UA',
      description: 'Поиск авто по марке, модели, году, цвету, топливу и региону.'
    },
    en: {
      title: 'Advanced search · Cars UA',
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

/** Title/description for a plate or VIN page — "AA1234BB — Toyota Camry 2015 · Cars UA". */
export function vehiclePageText(lang: Lang, f: Facts, kind: 'plate' | 'vin'): PageText {
  const year = f.year ? ` ${f.year}` : ''
  const facts = [f.car, f.year, ...f.extra].filter(Boolean).join(', ')
  const note = kind === 'vin' ? `${REGISTRY_NOTE[lang]} NHTSA vPIC.` : REGISTRY_NOTE[lang]
  return {
    title: `${f.value} — ${f.car ?? UNKNOWN_VEHICLE[lang]}${year} · ${SITE_NAME}`,
    description: `${kind === 'vin' ? 'VIN ' : ''}${f.value}${facts ? `: ${facts}` : ''}. ${note}`
  }
}
