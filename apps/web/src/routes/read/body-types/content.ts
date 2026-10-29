import { BODY_GUIDE_SHAPES, type BodyGuideShape } from '@/routes/read/links'
import type { L10n } from '@/routes/read/types'

/** Card order of the article. */
export const EXPLAINED_SHAPES = BODY_GUIDE_SHAPES
export type ExplainedShape = BodyGuideShape

type ShapeCopy = {
  what: L10n
  spot: L10n
  /** Registry spellings (brand, model as in the data); models the data does not hold are skipped. */
  examples: ReadonlyArray<{ brand: string; model: string }>
}

export const SHAPE_COPY: Readonly<Record<ExplainedShape, ShapeCopy>> = {
  sedan: {
    what: {
      ua: 'Три «об’єми»: капот, салон і окремий багажник з власною кришкою. Багажник відокремлений від салону - тихіше й жорсткіший кузов.',
      ru: 'Три «объёма»: капот, салон и отдельный багажник со своей крышкой. Багажник отделён от салона - тише и жёстче кузов.',
      en: 'Three “boxes”: hood, cabin and a separate boot with its own lid. The boot is walled off from the cabin, so it is quieter and the body stiffer.'
    },
    spot: {
      ua: 'Скло задніх стійок не відкривається разом із кришкою багажника.',
      ru: 'Заднее стекло не открывается вместе с крышкой багажника.',
      en: 'The rear window stays put when you open the boot.'
    },
    examples: [
      { brand: 'TOYOTA', model: 'CAMRY' },
      { brand: 'HYUNDAI', model: 'SONATA' },
      { brand: 'VOLKSWAGEN', model: 'JETTA' }
    ]
  },
  hatch: {
    what: {
      ua: 'Два «об’єми»: салон і багажник в одному просторі, а задні двері (з склом) піднімаються разом. Компактний і практичний - городній автомобіль № 1.',
      ru: 'Два «объёма»: салон и багажник в одном пространстве, а задняя дверь (со стеклом) поднимается целиком. Компактный и практичный - городской автомобиль № 1.',
      en: 'Two “boxes”: cabin and luggage space share one volume and the rear door, glass and all, lifts as one. Compact and practical - the city-car default.'
    },
    spot: {
      ua: 'Багажник відкривається разом із заднім склом. Кормова частина коротка.',
      ru: 'Багажник открывается вместе с задним стеклом. Задний свес короткий.',
      en: 'The tailgate takes the rear window with it, and the rear overhang is short.'
    },
    examples: [
      { brand: 'VOLKSWAGEN', model: 'GOLF' },
      { brand: 'SKODA', model: 'FABIA' },
      { brand: 'RENAULT', model: 'CLIO' }
    ]
  },
  wagon: {
    what: {
      ua: 'Седан або хетчбек, подовжений за задньою віссю: довгий дах і вертикальна задня кришка. Найбільший багажник у кузові розміром із легковик. У реєстрі - «УНІВЕРСАЛ».',
      ru: 'Седан или хэтчбек, удлинённый за задней осью: длинная крыша и вертикальная задняя дверь. Самый большой багажник в кузове размером с легковой. В реестре - «УНІВЕРСАЛ».',
      en: 'A sedan or hatch stretched behind the rear axle: long roof, upright tailgate, the biggest boot you get in a car-sized body. The registry calls it “УНІВЕРСАЛ”.'
    },
    spot: {
      ua: 'Дах тягнеться майже до заднього бампера, а посадка така ж, як у звичайного легковика.',
      ru: 'Крыша тянется почти до заднего бампера, а посадка такая же, как у обычного легкового.',
      en: 'The roof runs almost to the rear bumper, and the ride height stays that of the car it is based on.'
    },
    examples: [
      { brand: 'SKODA', model: 'OCTAVIA' },
      { brand: 'RENAULT', model: 'MEGANE' },
      { brand: 'FORD', model: 'FOCUS' }
    ]
  },
  coupe: {
    what: {
      ua: 'Дві двері, низький схил даху, спортивні пропорції. Кабріолет - те саме авто зі складним дахом.',
      ru: 'Две двери, низкая линия крыши, спортивные пропорции. Кабриолет - то же авто со складной крышей.',
      en: 'Two doors, a low sloping roof, sporty proportions. A convertible is the same car with a folding roof.'
    },
    spot: {
      ua: 'Низька висота (зазвичай близько 1,3–1,4 м) і довгі двері.',
      ru: 'Малая высота (обычно около 1,3–1,4 м) и длинные двери.',
      en: 'Low (usually about 1.3–1.4 m tall) with long doors.'
    },
    examples: [
      { brand: 'FORD', model: 'MUSTANG' },
      { brand: 'AUDI', model: 'A5' },
      { brand: 'SMART', model: 'FORTWO' }
    ]
  },
  suv: {
    what: {
      ua: 'Високий кузов із великим кліренсом (понад 17 см) і прямою посадкою, нерідко повнопривідний. Бувають справжні рамні позашляховики та кросовери на платформі легковика - див. нижче.',
      ru: 'Высокий кузов с большим клиренсом (более 17 см) и прямой посадкой, нередко полноприводный. Бывают настоящие рамные внедорожники и кроссоверы на платформе легковушки - см. ниже.',
      en: 'A tall body with generous ground clearance (over about 17 cm) and an upright seat, often all-wheel drive. There are true ladder-frame SUVs and crossovers built on a car platform - see below.'
    },
    spot: {
      ua: 'Висота зазвичай від 1,6 м; колісні арки та бампери піднято.',
      ru: 'Высота обычно от 1,6 м; колёсные арки и бамперы подняты.',
      en: 'Usually 1.6 m or taller, with raised arches and bumpers.'
    },
    examples: [
      { brand: 'TOYOTA', model: 'RAV4' },
      { brand: 'TOYOTA', model: 'LAND CRUISER PRADO' },
      { brand: 'HYUNDAI', model: 'TUCSON' }
    ]
  },
  mpv: {
    what: {
      ua: 'Мінівен: високий однооб’ємний кузов на 5–7 місць з трансформованим салоном. Простір важливіший за вигляд.',
      ru: 'Минивэн: высокий однообъёмный кузов на 5–7 мест с трансформируемым салоном. Простор важнее внешнего вида.',
      en: 'A minivan: a tall single-volume body for 5–7 people with a flexible interior. Space matters more than looks.'
    },
    spot: {
      ua: 'Капот короткий, лобове скло дуже похиле, дах високий і майже рівний.',
      ru: 'Капот короткий, лобовое стекло очень наклонено, крыша высокая и почти ровная.',
      en: 'A short hood, a steeply raked windscreen and a tall, nearly flat roof.'
    },
    examples: [
      { brand: 'OPEL', model: 'ZAFIRA' },
      { brand: 'RENAULT', model: 'MEGANE SCENIC' },
      { brand: 'FORD', model: 'GALAXY' }
    ]
  },
  van: {
    what: {
      ua: 'Коробка на колесах: для вантажу або до 9 пасажирів. Високий, довгий, зазвичай із зсувними бічними дверима.',
      ru: 'Коробка на колёсах: для груза или до 9 пассажиров. Высокий, длинный, обычно с сдвижными боковыми дверями.',
      en: 'A box on wheels for cargo or up to nine passengers: tall, long, usually with sliding side doors.'
    },
    spot: {
      ua: 'Висота 1,9 м і більше. Колісна база - від 3 м.',
      ru: 'Высота 1,9 м и больше. Колёсная база - от 3 м.',
      en: 'About 1.9 m or taller, with a wheelbase from roughly 3 m.'
    },
    examples: [
      { brand: 'VOLKSWAGEN', model: 'TRANSPORTER' },
      { brand: 'FORD', model: 'TRANSIT CONNECT' },
      { brand: 'RENAULT', model: 'TRAFIC' }
    ]
  },
  pickup: {
    what: {
      ua: 'Кабіна й відкритий вантажний кузов позаду. Зазвичай рамна конструкція, повний привід і висока вантажопідйомність.',
      ru: 'Кабина и открытый грузовой кузов позади. Обычно рамная конструкция, полный привод и высокая грузоподъёмность.',
      en: 'A cab with an open cargo bed behind it. Usually a ladder frame, four-wheel drive and a high payload.'
    },
    spot: {
      ua: 'Є відкритий кузов-платформа; довжина часто понад 5 м.',
      ru: 'Есть открытая грузовая платформа; длина часто больше 5 м.',
      en: 'An open load bed, and often more than 5 m long.'
    },
    examples: [
      { brand: 'TOYOTA', model: 'HILUX' },
      { brand: 'FORD', model: 'RANGER' },
      { brand: 'VOLKSWAGEN', model: 'AMAROK' }
    ]
  }
}

type SuvSide = { title: L10n; points: readonly L10n[]; examples: ReadonlyArray<{ brand: string; model: string }> }

export const SUV_INTRO: L10n = {
  ua: 'У реєстрі і RAV4, і Land Cruiser Prado - «УНІВЕРСАЛ»: різниці між ними в даних немає. Тому розрізняємо за конструкцією.',
  ru: 'В реестре и RAV4, и Land Cruiser Prado - «УНІВЕРСАЛ»: разницы между ними в данных нет. Поэтому различаем по конструкции.',
  en: 'The registry files both the RAV4 and the Land Cruiser Prado as “УНІВЕРСАЛ”, so the data cannot tell them apart. The difference is in how they are built.'
}

export const SUV_SIDES: { frame: SuvSide; crossover: SuvSide } = {
  frame: {
    title: { ua: 'Рамний SUV', ru: 'Рамный SUV', en: 'Ladder-frame SUV' },
    points: [
      {
        ua: 'Кузов стоїть на окремій потужній рамі - як у вантажівки.',
        ru: 'Кузов стоит на отдельной мощной раме - как у грузовика.',
        en: 'The body sits on a separate heavy frame, like a truck.'
      },
      {
        ua: 'Краще їде бездоріжжям, тягне важкий причіп і витримує навантаження.',
        ru: 'Лучше едет по бездорожью, тянет тяжёлый прицеп и держит нагрузку.',
        en: 'Better off-road, tows a heavy trailer and takes load.'
      },
      {
        ua: 'Важчий, ніж кросовер, більше палива; на асфальті «твердіший».',
        ru: 'Тяжелее кроссовера, больше расход; на асфальте «жёстче».',
        en: 'Heavier and thirstier than a crossover, and firmer on tarmac.'
      }
    ],
    examples: [
      { brand: 'TOYOTA', model: 'LAND CRUISER PRADO' },
      { brand: 'MITSUBISHI', model: 'PAJERO' }
    ]
  },
  crossover: {
    title: { ua: 'Кросовер', ru: 'Кроссовер', en: 'Crossover' },
    points: [
      {
        ua: 'Несучий кузов на платформі звичайного легковика, лише з вищою підвіскою.',
        ru: 'Несущий кузов на платформе обычного легкового, только с более высокой подвеской.',
        en: 'A unibody on an ordinary car’s platform, just with a higher suspension.'
      },
      {
        ua: 'Комфортніший і економніший; часто лише передній привід або підключуваний повний.',
        ru: 'Комфортнее и экономичнее; часто только передний привод или подключаемый полный.',
        en: 'More comfortable and economical; often front-drive or part-time all-wheel drive.'
      },
      {
        ua: 'Для ґрунтових доріг і снігу, але не для серйозного бездоріжжя.',
        ru: 'Для грунтовок и снега, но не для серьёзного бездорожья.',
        en: 'Good for gravel and snow, not for serious off-roading.'
      }
    ],
    examples: [
      { brand: 'TOYOTA', model: 'RAV4' },
      { brand: 'HYUNDAI', model: 'TUCSON' },
      { brand: 'NISSAN', model: 'QASHQAI' }
    ]
  }
}

export const SUV_NOTE: L10n = {
  ua: 'Ми не зберігаємо тип несучої конструкції (рама чи моноблок) - це пояснення, а не дані з реєстру. Розміри нижче - з довідників.',
  ru: 'Мы не храним тип несущей конструкции (рама или моноблок) - это объяснение, а не данные реестра. Размеры ниже - из справочников.',
  en: 'We do not store the construction type (frame or unibody) - this is an explanation, not registry data. The sizes shown come from reference catalogues.'
}

export const QUIRK: L10n = {
  ua: 'Поле «кузов» у реєстрі - вільний текст, який вносять під час реєстрації. Тому Octavia може бути «ЛІФТБЕК» чи «УНІВЕРСАЛ», а кросовери здебільшого - «УНІВЕРСАЛ». Тип моделі тут визначено за більшістю авто в реєстрі та даними RDW (Нідерланди), тож це «типовий» кузов, не точний для кожного авто.',
  ru: 'Поле «кузов» в реестре - свободный текст, который вносят при регистрации. Поэтому Octavia может быть «ЛІФТБЕК» или «УНІВЕРСАЛ», а кроссоверы чаще всего - «УНІВЕРСАЛ». Тип модели здесь определён по большинству авто в реестре и данным RDW (Нидерланды), так что это «типичный» кузов, не точный для каждой машины.',
  en: 'The registry’s “body” field is free text typed in at registration, so an Octavia may be “ЛІФТБЕК” or “УНІВЕРСАЛ” and crossovers are mostly “УНІВЕРСАЛ”. A model’s type here comes from most of its cars in the registry plus RDW (Netherlands) data - the usual body, not exact for every car.'
}
