import type { L10n } from '@/routes/read/types'

// Photos live in `public/read/vin/` (560 px webp, hand-picked, watermark-free). Captions say what kind of label it is, never
// whose car it was. History dates: ISO 3779 first edition 1977, the US dash-plate rule of 1968 and the 17-character rule
// from model year 1981 (NHTSA). Format examples show the pattern only, they are not real cars.

export const EXAMPLE_LINK_VIN = 'KMHD350H6GU123456'

export type VinExample = { vin: string; label: L10n }

/** Chips under the "type a VIN" box: a passing VIN, then the usual ways a VIN fails. */
export const VIN_EXAMPLES: VinExample[] = [
  { vin: 'KMHD350H6GU123456', label: { ua: 'Коректний', ru: 'Корректный', en: 'Valid' } },
  {
    vin: 'WVWZZZ1JZ3W386752',
    label: {
      ua: 'Європейський (контрольна цифра не збігається)',
      ru: 'Европейский (контрольная цифра не сходится)',
      en: 'European (check digit fails)'
    }
  },
  {
    vin: '1M8GDM9AOKP042788',
    label: { ua: 'Літера O замість нуля', ru: 'Буква O вместо нуля', en: 'Letter O instead of zero' }
  },
  {
    vin: 'XXXGDM9AXKP042788',
    label: { ua: 'Невідомий префікс виробника', ru: 'Неизвестный префикс производителя', en: 'Unknown maker prefix' }
  },
  { vin: 'KMHD350H6GU12345', label: { ua: 'Не вистачає символу', ru: 'Не хватает символа', en: 'A character missing' } }
]

export type HistoryItem = { when: L10n; text: L10n }

export const HISTORY_INTRO: L10n = {
  ua: 'Єдиного формату VIN було не завжди: спершу кожен виробник нумерував авто по-своєму, і лише з початку 1980-х цифри та літери стали читатися однаково по всьому світу.',
  ru: 'Единого формата VIN было не всегда: сначала каждый производитель нумеровал авто по-своему, и лишь с начала 1980-х цифры и буквы стали читаться одинаково по всему миру.',
  en: 'There was not always one VIN format: at first every maker numbered cars its own way, and only from the early 1980s did the characters start to read the same everywhere.'
}

export const HISTORY: HistoryItem[] = [
  {
    when: { ua: 'До 1950-х', ru: 'До 1950-х', en: 'Before the 1950s' },
    text: {
      ua: 'Номер рами чи двигуна, який виробник ставив як хотів. Загальних правил немає, збіги номерів між марками звичайна річ.',
      ru: 'Номер рамы или двигателя, который производитель ставил как хотел. Общих правил нет, совпадения номеров между марками обычное дело.',
      en: 'A frame or engine number that the maker stamped as it saw fit. There were no common rules, and the same number on two makes was normal.'
    }
  },
  {
    when: { ua: '1950-1960-ті', ru: '1950-1960-е', en: '1950s-60s' },
    text: {
      ua: 'Американські виробники ставлять власні серійні номери завдовжки 10-13 символів: рік, завод, кузов, двигун і порядковий номер, але в кожного свій порядок.',
      ru: 'Американские производители ставят собственные серийные номера длиной 10-13 символов: год, завод, кузов, двигатель и порядковый номер, но у каждого свой порядок.',
      en: 'American makers use their own serial numbers of about 10-13 characters: year, plant, body, engine and a running number, each maker in its own order.'
    }
  },
  {
    when: { ua: '1968', ru: '1968', en: '1968' },
    text: {
      ua: 'У США номер має стояти на табличці на панелі приладів так, щоб його було видно крізь лобове скло. Це місце лишається стандартним і досі.',
      ru: 'В США номер должен стоять на табличке на панели приборов так, чтобы его было видно через лобовое стекло. Это место остаётся стандартным и сейчас.',
      en: 'In the USA the number has to sit on a plate on the dashboard, readable through the windscreen. That spot is still the standard today.'
    }
  },
  {
    when: { ua: '1977-1981', ru: '1977-1981', en: '1977-1981' },
    text: {
      ua: 'Стандарт ISO 3779 (1977) описує структуру номера, а з 1981 модельного року у США всі нові авто мають 17-символьний VIN. Літери I, O, Q виключено, щоб їх не плутали з 1 і 0.',
      ru: 'Стандарт ISO 3779 (1977) описывает структуру номера, а с 1981 модельного года в США все новые авто имеют 17-символьный VIN. Буквы I, O, Q исключены, чтобы их не путали с 1 и 0.',
      en: 'The ISO 3779 standard (1977) describes the structure, and from model year 1981 every new car in the USA has a 17-character VIN. The letters I, O and Q were dropped so they cannot be mixed up with 1 and 0.'
    }
  },
  {
    when: { ua: '1980-ті - 1990-ті', ru: '1980-е - 1990-е', en: '1980s-90s' },
    text: {
      ua: 'Європа, Японія та інші ринки переходять на той самий формат. Контрольна цифра лишається обов’язковою тільки в Північній Америці. Заводи колишнього СРСР отримують власні префікси (наприклад XTA для АвтоВАЗу, Y6D для ЗАЗу).',
      ru: 'Европа, Япония и другие рынки переходят на тот же формат. Контрольная цифра остаётся обязательной только в Северной Америке. Заводы бывшего СССР получают собственные префиксы (например XTA для АвтоВАЗа, Y6D для ЗАЗа).',
      en: 'Europe, Japan and other markets move to the same format. The check digit stays mandatory only in North America. Plants of the former USSR get their own prefixes (for example XTA for AvtoVAZ, Y6D for ZAZ).'
    }
  },
  {
    when: { ua: '2010', ru: '2010', en: '2010' },
    text: {
      ua: 'Коди модельного року пройшли 30-річне коло: A, що означала 1980, знову означає 2010.',
      ru: 'Коды модельного года прошли 30-летний круг: A, означавшая 1980, снова означает 2010.',
      en: 'The model-year codes completed their 30-year cycle: A, which meant 1980, means 2010 again.'
    }
  },
  {
    when: { ua: '2021 і далі', ru: '2021 и далее', en: '2021 onwards' },
    text: {
      ua: 'Відкритий реєстр України починає публікувати VIN. Для записів до 2021 року номерного знака може бути достатньо, а VIN - ні.',
      ru: 'Открытый реестр Украины начинает публиковать VIN. Для записей до 2021 года номерного знака может быть достаточно, а VIN - нет.',
      en: 'The Ukrainian open registry starts publishing VINs. For records before 2021 there may be a plate and no VIN.'
    }
  }
]

export type VinPhoto = { file: string; caption: L10n }

export type VinPlace = {
  id: string
  title: L10n
  text: L10n
  photos: VinPhoto[]
}

export const WHERE_INTRO: L10n = {
  ua: 'VIN зазвичай записано в кількох місцях і в різному вигляді: це табличка, наклейка зі штрихкодом, випресуваний чи нанесений номер на металі та запис у документах. Усі версії мають збігатися.',
  ru: 'VIN обычно записан в нескольких местах и в разном виде: это табличка, наклейка со штрихкодом, выбитый или нанесённый номер на металле и запись в документах. Все версии должны совпадать.',
  en: 'A VIN is usually written in several places and in different forms: a plate, a barcode sticker, a number stamped or engraved into the metal, and the entry in the documents. All versions must match.'
}

export const PLACES: VinPlace[] = [
  {
    id: 'windscreen',
    title: {
      ua: 'Внизу лобового скла з боку водія',
      ru: 'Внизу лобового стекла со стороны водителя',
      en: 'Base of the windscreen, driver’s side'
    },
    text: {
      ua: 'Найпростіше місце: номер видно ззовні, не відкриваючи нічого. Це тонка пластикова чи металева табличка, наклейка або напис, витравлений на самому склі. Часто поруч QR-код.',
      ru: 'Самое простое место: номер видно снаружи, ничего не открывая. Это тонкая пластиковая или металлическая табличка, наклейка или надпись, вытравленная на самом стекле. Часто рядом QR-код.',
      en: 'The easiest place: the number is readable from outside without opening anything. It is a thin plastic or metal plate, a sticker, or text etched into the glass itself. A QR code often sits next to it.'
    },
    photos: [
      {
        file: 'windscreen-1',
        caption: { ua: 'Наклейка на склі', ru: 'Наклейка на стекле', en: 'Sticker on the glass' }
      },
      {
        file: 'windscreen-2',
        caption: { ua: 'Табличка під склом', ru: 'Табличка под стеклом', en: 'Plate under the glass' }
      },
      {
        file: 'dash-1',
        caption: {
          ua: 'Наклейка на панелі приладів, видно крізь скло',
          ru: 'Наклейка на панели приборов, видно сквозь стекло',
          en: 'Label on the dash, seen through the glass'
        }
      },
      {
        file: 'dash-2',
        caption: { ua: 'Те саме на електромобілі', ru: 'То же на электромобиле', en: 'The same on an electric car' }
      }
    ]
  },
  {
    id: 'pillar',
    title: {
      ua: 'Стійка або торець дверей водія',
      ru: 'Стойка или торец двери водителя',
      en: 'Driver’s door pillar or door edge'
    },
    text: {
      ua: 'Біла чи срібляста наклейка зі штрихкодом, на ній також тиск у шинах, дата випуску й допустима маса. Типова для авто з США, Канади та Японії.',
      ru: 'Белая или серебристая наклейка со штрихкодом, на ней также давление в шинах, дата выпуска и допустимая масса. Типична для авто из США, Канады и Японии.',
      en: 'A white or silver sticker with a barcode that also lists tyre pressure, build date and weight limits. Typical of cars from the USA, Canada and Japan.'
    },
    photos: [
      {
        file: 'pillar-1',
        caption: { ua: 'Наклейка на стійці дверей', ru: 'Наклейка на стойке двери', en: 'Sticker on the door pillar' }
      },
      {
        file: 'pillar-2',
        caption: {
          ua: 'Чорна табличка з даними виробника',
          ru: 'Чёрная табличка с данными производителя',
          en: 'Black plate with the maker’s data'
        }
      }
    ]
  },
  {
    id: 'plate',
    title: {
      ua: 'Заводська табличка в моторному відсіку',
      ru: 'Заводская табличка в моторном отсеке',
      en: 'The maker’s plate in the engine bay'
    },
    text: {
      ua: 'У європейських авто це металева табличка на передній панелі, стійці або перегородці. Окрім VIN, на ній номер офіційного типу затвердження (починається з e1, e4 тощо) і допустимі маси.',
      ru: 'У европейских авто это металлическая табличка на передней панели, стойке или перегородке. Помимо VIN, на ней номер официального типа одобрения (начинается с e1, e4 и т. д.) и допустимые массы.',
      en: 'On European cars this is a metal plate on the front panel, pillar or bulkhead. Besides the VIN it carries the type-approval number (starting e1, e4 and so on) and the permitted weights.'
    },
    photos: [
      {
        file: 'plate-audi',
        caption: { ua: 'Табличка німецького авто', ru: 'Табличка немецкого авто', en: 'Plate of a German car' }
      },
      {
        file: 'plate-ford',
        caption: { ua: 'Табличка з рамкою полів', ru: 'Табличка с рамкой полей', en: 'Plate with a field grid' }
      },
      {
        file: 'plate-porsche',
        caption: { ua: 'Табличка спорткара', ru: 'Табличка спорткара', en: 'Plate of a sports car' }
      }
    ]
  },
  {
    id: 'stamped',
    title: { ua: 'Вибито на металі', ru: 'Выбито на металле', en: 'Stamped into the metal' },
    text: {
      ua: 'Табличку чи наклейку можна замінити, а номер, вибитий на кузові чи рамі, - значно важче. Його шукають на рамі вантажівок і позашляховиків, на підлозі під килимком чи сидінням, на перегородці моторного відсіку, у багажнику під підлогою.',
      ru: 'Табличку или наклейку можно заменить, а номер, выбитый на кузове или раме, - намного сложнее. Его ищут на раме грузовиков и внедорожников, на полу под ковриком или сиденьем, на перегородке моторного отсека, в багажнике под полом.',
      en: 'A plate or sticker can be swapped, a number stamped into the body or frame is much harder to fake. Look on the frame of trucks and SUVs, on the floor under the carpet or seat, on the engine-bay bulkhead or under the boot floor.'
    },
    photos: [
      { file: 'stamped-frame', caption: { ua: 'На лонжероні рами', ru: 'На лонжероне рамы', en: 'On a frame rail' } },
      {
        file: 'stamped-floor',
        caption: { ua: 'На підлозі під килимком', ru: 'На полу под ковриком', en: 'On the floor under the carpet' }
      }
    ]
  },
  {
    id: 'stickers',
    title: {
      ua: 'Наклейки на кузові та пластику',
      ru: 'Наклейки на кузове и пластике',
      en: 'Stickers on panels and plastic parts'
    },
    text: {
      ua: 'Багато виробників клеять дублікати VIN на двері, крила, пороги, капот і пластикові елементи, наприклад під кришкою двірників. Такі наклейки рвуться при знятті, тому відсутня чи інша наклейка підказує, що деталь міняли. Це привід глянути уважніше, а не доказ.',
      ru: 'Многие производители клеят дубликаты VIN на двери, крылья, пороги, капот и пластиковые элементы, например под крышкой дворников. Такие наклейки рвутся при снятии, поэтому отсутствующая или другая наклейка подсказывает, что деталь меняли. Это повод присмотреться, а не доказательство.',
      en: 'Many makers glue duplicate VINs on doors, wings, sills, the bonnet and plastic parts such as the wiper cowl. These labels tear when removed, so a missing or different one hints that a part was replaced. A reason to look closer, not proof.'
    },
    photos: [
      {
        file: 'cowl',
        caption: { ua: 'Під кришкою двірників', ru: 'Под крышкой дворников', en: 'Under the wiper cowl' }
      },
      { file: 'barcode-1', caption: { ua: 'Штрихкод на порозі', ru: 'Штрихкод на пороге', en: 'Barcode on a sill' } },
      {
        file: 'barcode-2',
        caption: {
          ua: 'Наклейка зі штрихкодом на деталі',
          ru: 'Наклейка со штрихкодом на детали',
          en: 'Barcode sticker on a part'
        }
      }
    ]
  },
  {
    id: 'docs',
    title: { ua: 'У документах', ru: 'В документах', en: 'In the documents' },
    text: {
      ua: 'У посвідченні про реєстрацію це поле E «Ідентифікаційний номер транспортного засобу», а в (E.1) - номер шасі чи кузова, коли він інший. Номер є і в страховому полісі.',
      ru: 'В свидетельстве о регистрации это поле E «Идентификационный номер транспортного средства», а в (E.1) - номер шасси или кузова, когда он другой. Номер есть и в страховом полисе.',
      en: 'On the Ukrainian registration card it is field E, “vehicle identification number”, and (E.1) holds the chassis or body number when it differs. The insurance policy repeats it.'
    },
    photos: [
      {
        file: 'doc-ua',
        caption: { ua: 'Свідоцтво України, поле E', ru: 'Свидетельство Украины, поле E', en: 'Ukrainian card, field E' }
      }
    ]
  }
]

export const WHERE_ALSO: L10n = {
  ua: 'Мотоцикли зазвичай мають номер на рульовій колонці чи рамі, а причепи й вантажівки - на рамі або табличці спереду зліва.',
  ru: 'Мотоциклы обычно имеют номер на рулевой колонке или раме, а прицепы и грузовики - на раме или табличке спереди слева.',
  en: 'Motorcycles usually carry it on the steering head or the frame, trailers and trucks on the frame or on a plate at the front left.'
}

export type LegacyRow = { era: L10n; example: string | null; text: L10n }

export const LEGACY_INTRO: L10n = {
  ua: 'Старе авто може мати зовсім не 17-символьний номер. Це не підробка: так було до стандарту. Нижче шаблони, які ще трапляються на ретро-авто та імпорті. Приклади показують лише формат і не належать реальним авто.',
  ru: 'У старого авто номер может быть совсем не 17-символьным. Это не подделка: так было до стандарта. Ниже шаблоны, которые ещё встречаются на ретро-авто и импорте. Примеры показывают только формат и не принадлежат реальным авто.',
  en: 'An old car can have a number that is nowhere near 17 characters. That is not a fake: it is how things were before the standard. Below are the patterns that still turn up on classics and imports. The examples show the format only and belong to no real car.'
}

export const LEGACY: LegacyRow[] = [
  {
    era: { ua: 'США, 1960-ті', ru: 'США, 1960-е', en: 'USA, 1960s' },
    example: '5F07F100001',
    text: {
      ua: '11 символів у стилі Ford: рік, завод, кузов, двигун, порядковий номер. Такий номер у декодерів на кшталт NHTSA не розбирається.',
      ru: '11 символов в стиле Ford: год, завод, кузов, двигатель, порядковый номер. Такой номер в декодерах вроде NHTSA не разбирается.',
      en: '11 characters in the Ford style: year, plant, body, engine, running number. Decoders such as NHTSA do not parse these.'
    }
  },
  {
    era: { ua: 'США, 1960-ті (GM)', ru: 'США, 1960-е (GM)', en: 'USA, 1960s (GM)' },
    example: '30837S100001',
    text: {
      ua: '12 символів: код моделі, літера заводу й порядковий номер. Той самий принцип, інший порядок.',
      ru: '12 символов: код модели, буква завода и порядковый номер. Тот же принцип, другой порядок.',
      en: '12 characters: model code, a plant letter and a running number. The same idea in another order.'
    }
  },
  {
    era: { ua: 'Японія (внутрішній ринок)', ru: 'Япония (внутренний рынок)', en: 'Japan (home market)' },
    example: 'AE86-1234567',
    text: {
      ua: 'Не VIN, а номер кузова: код шасі, дефіс і серійний номер. Такі авто потрапляють до нас з аукціонів, тому в реєстрі їх можуть записати інакше.',
      ru: 'Не VIN, а номер кузова: код шасси, дефис и серийный номер. Такие авто попадают к нам с аукционов, поэтому в реестре их могут записать иначе.',
      en: 'Not a VIN but a frame number: a chassis code, a dash and a serial. These cars reach us from auctions, so the registry may record them differently.'
    }
  },
  {
    era: { ua: 'Європа, 1970-ті', ru: 'Европа, 1970-е', en: 'Europe, 1970s' },
    example: '123.230-12-012345',
    text: {
      ua: 'Номер шасі з кодом моделі, службовим кодом і серійним номером. У кожного виробника довжина й порядок свої.',
      ru: 'Номер шасси с кодом модели, служебным кодом и серийным номером. У каждого производителя длина и порядок свои.',
      en: 'A chassis number with a model code, a service code and a serial. Length and order differ from maker to maker.'
    }
  },
  {
    era: {
      ua: 'СРСР (Москвич, Жигулі, ЗАЗ, Дніпро)',
      ru: 'СССР (Москвич, Жигули, ЗАЗ, Днепр)',
      en: 'USSR (Moskvich, Zhiguli, ZAZ, Dnepr)'
    },
    example: null,
    text: {
      ua: 'VIN як такого не було: завод бив короткий номер кузова та номер двигуна, а в техпаспорті записували їх. Тому в українському реєстрі такі авто фігурують під номером кузова чи під 17-символьним номером, який дали пізніше.',
      ru: 'VIN как такового не было: завод бил короткий номер кузова и номер двигателя, а в техпаспорте записывали их. Поэтому в украинском реестре такие авто фигурируют под номером кузова или под 17-символьным номером, который дали позже.',
      en: 'There was no VIN as such: the plant stamped a short body number and an engine number, and the registration papers recorded those. So in the Ukrainian registry such cars appear under a body number or under a 17-character number given later.'
    }
  },
  {
    era: { ua: 'Колишній СРСР, з 1990-х', ru: 'Бывший СССР, с 1990-х', en: 'Former USSR, from the 1990s' },
    example: null,
    text: {
      ua: 'Повні 17 символів із власними префіксами заводів: XTA - Lada (АвтоВАЗ), Y6D - ЗАЗ. Мотоцикли й причепи цих марок можуть бути зареєстровані з номером, якого жоден декодер не знає: це все одно коректний запис у документах.',
      ru: 'Полные 17 символов с собственными префиксами заводов: XTA - Lada (АвтоВАЗ), Y6D - ЗАЗ. Мотоциклы и прицепы этих марок могут быть зарегистрированы с номером, которого ни один декодер не знает: это всё равно корректная запись в документах.',
      en: 'Full 17 characters with plant prefixes of their own: XTA is Lada (AvtoVAZ), Y6D is ZAZ. Motorcycles and trailers of these brands can be registered under a number no decoder knows: it is still a valid entry in the papers.'
    }
  }
]

export const LEGACY_NOTE: L10n = {
  ua: 'Наш пошук приймає лише 17-символьні VIN. Для старішого номера шукайте за номерним знаком: його розбір - у гіді про номерні знаки.',
  ru: 'Наш поиск принимает только 17-символьные VIN. Для более старого номера ищите по номерному знаку: его разбор - в гиде о номерных знаках.',
  en: 'Our search accepts 17-character VINs only. For an older number search by plate: its anatomy is in the plates guide.'
}

export type ErrorItem = { id: string; title: L10n; text: L10n }

export const ERRORS_INTRO: L10n = {
  ua: 'Якщо VIN не розбирається, найчастіше винна одна з причин нижче. Більшість із них - не ознака підробки.',
  ru: 'Если VIN не разбирается, чаще всего виновата одна из причин ниже. Большинство из них - не признак подделки.',
  en: 'When a VIN does not decode, one of the causes below is the likely culprit. Most are not a sign of a fake.'
}

export const ERRORS: ErrorItem[] = [
  {
    id: 'chars',
    title: {
      ua: 'Не ті символи чи не та довжина',
      ru: 'Не те символы или не та длина',
      en: 'Wrong characters or length'
    },
    text: {
      ua: 'У VIN рівно 17 символів без літер I, O і Q. Найчастіше плутають 0 і O, 1 і I, 8 і B, 5 і S - особливо на фото чи витравленому склі. Спробуйте обидва варіанти.',
      ru: 'В VIN ровно 17 символов без букв I, O и Q. Чаще всего путают 0 и O, 1 и I, 8 и B, 5 и S - особенно на фото или вытравленном стекле. Попробуйте оба варианта.',
      en: 'A VIN has exactly 17 characters and never an I, O or Q. The usual mix-ups are 0 and O, 1 and I, 8 and B, 5 and S, especially on photos or etched glass. Try both readings.'
    }
  },
  {
    id: 'check',
    title: { ua: 'Контрольна цифра не збігається', ru: 'Контрольная цифра не сходится', en: 'The check digit fails' },
    text: {
      ua: 'Дев’ятий символ обов’язково рахується лише для авто з Північної Америки. Європейські й азійські VIN її часто не підтримують, тож це норма. Якщо ж не збігається на американському авто, є помилка в одному символі або номер змінено.',
      ru: 'Девятый символ обязательно считается только для авто из Северной Америки. Европейские и азиатские VIN её часто не поддерживают, так что это норма. Если же не сходится на американском авто, есть ошибка в одном символе или номер изменён.',
      en: 'The ninth character is only required to be calculated on North American cars. European and Asian VINs often ignore it, so a fail is normal there. On an American car it points to a mistyped character or an altered number.'
    }
  },
  {
    id: 'maker',
    title: { ua: 'Невідомий префікс виробника', ru: 'Неизвестный префикс производителя', en: 'Unknown maker prefix' },
    text: {
      ua: 'Таблиця перших трьох символів не охоплює всіх виробників: дрібні, китайські та нові марки, причепи, техніка. Номер при цьому може бути цілком правильним, просто виробника ми не назвемо.',
      ru: 'Таблица первых трёх символов не охватывает всех производителей: мелкие, китайские и новые марки, прицепы, техника. Номер при этом может быть вполне правильным, просто производителя мы не назовём.',
      en: 'The table of the first three characters does not cover every maker: small, Chinese and new brands, trailers, machinery. The number can be perfectly fine, we just cannot name the maker.'
    }
  },
  {
    id: 'nonstandard',
    title: {
      ua: 'Не автомобіль, а техніка чи причіп',
      ru: 'Не автомобиль, а техника или прицеп',
      en: 'Machinery and trailers, not cars'
    },
    text: {
      ua: 'Трактори, мотоблоки, двигуни й частина причепів мають номер власного формату: заводську табличку з довільним серійним номером, іноді з написом про країну виробництва. Дилерська наклейка на причепі лише повторює номер, першоджерело - табличка виробника.',
      ru: 'Тракторы, мотоблоки, двигатели и часть прицепов имеют номер собственного формата: заводскую табличку с произвольным серийным номером, иногда с надписью о стране производства. Дилерская наклейка на прицепе лишь повторяет номер, первоисточник - табличка производителя.',
      en: 'Tractors, walk-behind units, engines and some trailers carry a number of their own format: a maker’s plate with a free-form serial, sometimes with a country-of-origin note. A dealer sticker on a trailer only repeats the number, the maker’s plate is the source.'
    }
  }
]

export const ERROR_PHOTOS: VinPhoto[] = [
  {
    file: 'err-jincheng',
    caption: {
      ua: 'Табличка китайського виробника: номер є, але формат свій',
      ru: 'Табличка китайского производителя: номер есть, но формат свой',
      en: 'Plate of a Chinese maker: there is a number, in its own format'
    }
  },
  {
    file: 'err-tractor',
    caption: {
      ua: 'Табличка трактора китайського виробництва: VIN немає',
      ru: 'Табличка трактора китайского производства: VIN нет',
      en: 'Plate of a Chinese-made tractor: no VIN as such'
    }
  }
]

export const ERRORS_CHECKLIST: L10n = {
  ua: 'Що робити: порівняйте номер на авто (табличка, вибитий номер) із записом у документах, а відсутність результату перевірте і за VIN, і за номерним знаком.',
  ru: 'Что делать: сравните номер на авто (табличка, выбитый номер) с записью в документах, а отсутствие результата проверьте и по VIN, и по номерному знаку.',
  en: 'What to do: compare the number on the car (plate, stamped number) with the one in the documents, and when nothing is found try both the VIN and the plate.'
}

export type AppStep = { title: L10n; text: L10n }

export const APP_INTRO: L10n = {
  ua: 'Пошук за VIN працює в тому самому полі, що й пошук за номерним знаком: система сама розпізнає 17 символів.',
  ru: 'Поиск по VIN работает в том же поле, что и поиск по номерному знаку: система сама распознаёт 17 символов.',
  en: 'A VIN search uses the same box as a plate search: the app recognises 17 characters on its own.'
}

export const APP_STEPS: AppStep[] = [
  {
    title: { ua: 'Впишіть або вставте VIN', ru: 'Впишите или вставьте VIN', en: 'Type or paste the VIN' },
    text: {
      ua: 'На головній у полі «Номерний знак або VIN». Пробіли не заважають, а літери I, O та Q програма не прийме, бо їх у VIN не буває.',
      ru: 'На главной в поле «Номерной знак или VIN». Пробелы не мешают, а буквы I, O и Q программа не примет, потому что их в VIN не бывает.',
      en: 'On the home page, in the “Plate number or VIN” box. Spaces do not matter, and the letters I, O and Q are not accepted because a VIN never has them.'
    }
  },
  {
    title: { ua: 'Або знайдіть за фото', ru: 'Или найдите по фото', en: 'Or find it from a photo' },
    text: {
      ua: 'Не обов’язково вводити номер руками: застосунок сам знайде VIN на зображенні. Завантажте готове фото («Пошук за фото», «Фото VIN») або зніміть наклейку, табличку чи штрихкод камерою («Камера», «AR-скан»): розпізнавання працює просто в браузері. Підійдіть ближче, без відблисків, і порівняйте знайдений номер із фото, бо схожі символи (0 і O, 1 і I) можна сплутати.',
      ru: 'Вводить номер руками не обязательно: приложение само найдёт VIN на изображении. Загрузите готовое фото («Поиск по фото», «Фото VIN») или снимите наклейку, табличку или штрихкод камерой («Камера», «AR-скан»): распознавание работает прямо в браузере. Подойдите ближе, без бликов, и сравните найденный номер с фото, ведь похожие символы (0 и O, 1 и I) можно спутать.',
      en: 'You do not have to type it: the app can find the VIN in an image. Upload an existing picture (“Search by image”, “VIN photo”) or shoot a sticker, plate or barcode with the camera (“Camera”, “AR scan”): recognition runs right in the browser. Get close, avoid glare, and compare the found number with the photo, since look-alike characters (0 and O, 1 and I) can be confused.'
    }
  },
  {
    title: { ua: 'Що ви побачите', ru: 'Что вы увидите', en: 'What you get' },
    text: {
      ua: 'Розшифровку виробника, моделі, року й двигуна (повніше для авто з ринку США, для європейських менше), історію реєстрацій з відкритого реєстру за цим VIN, перевірку розшуку, відкликання виробника й посилання на архіви аукціонів.',
      ru: 'Расшифровку производителя, модели, года и двигателя (полнее для авто с рынка США, для европейских меньше), историю регистраций из открытого реестра по этому VIN, проверку розыска, отзывные кампании производителя и ссылки на архивы аукционов.',
      en: 'A decode of maker, model, year and engine (fuller for US-market cars, thinner for European ones), the registration history from the open registry for that VIN, the wanted check, the maker’s recalls and links to auction archives.'
    }
  },
  {
    title: { ua: 'Якщо нічого не знайдено', ru: 'Если ничего не найдено', en: 'If nothing is found' },
    text: {
      ua: 'Реєстр відкритий з 2013 року, а VIN у ньому з 2021. Авто може бути не в реєстрі, мати місцевий номер кузова замість VIN або бути записаним лише під номерним знаком. Спробуйте пошук за знаком, перевірте символи за розділом про помилки та скористайтеся посиланням на перевірку AUTO.RIA.',
      ru: 'Реестр открыт с 2013 года, а VIN в нём с 2021. Авто может не быть в реестре, иметь местный номер кузова вместо VIN или быть записанным лишь под номерным знаком. Попробуйте поиск по знаку, проверьте символы по разделу об ошибках и воспользуйтесь ссылкой на проверку AUTO.RIA.',
      en: 'The registry is open since 2013 and carries VINs only since 2021. The car may be absent, may sit under a local body number instead of a VIN, or may be recorded under its plate only. Try the plate, recheck the characters against the errors section and use the AUTO.RIA check link.'
    }
  }
]

export const APP_NOTE: L10n = {
  ua: 'Результат - це дані з відкритих джерел, а не офіційна довідка: перед покупкою звіряйте їх із документами й самим авто.',
  ru: 'Результат - это данные из открытых источников, а не официальная справка: перед покупкой сверяйте их с документами и самим авто.',
  en: 'The result is open-source data, not an official certificate: check it against the documents and the car itself before buying.'
}
