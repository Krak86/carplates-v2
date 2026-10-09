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
