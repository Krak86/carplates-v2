import type { L10n } from '@/routes/read/types'
import type { PlateSampleSpec } from '@/routes/read/plates/PlateSample'

// Facts below come from the avtonomera.net.ua article on Ukrainian plates (a plate-making shop, 2026-03-31) and are cross-checked
// against the HSC pages in `content.ts` where those cover the same ground. It is a commercial source: wording stays factual and
// the samples are drawings, not photos. Never copy that site's pictures.

export const AVTONOMERA_URL = 'https://avtonomera.net.ua/ua/nomerni-znaky-avtomobilni-nomera-ukrayiny.html'

export const KINDS_SOURCE: { url: string; label: L10n } = {
  url: AVTONOMERA_URL,
  label: {
    ua: 'avtonomera.net.ua: номерні знаки України (кольори, військові, дипломатичні, історія)',
    ru: 'avtonomera.net.ua: номерные знаки Украины (цвета, военные, дипломатические, история)',
    en: 'avtonomera.net.ua: Ukrainian plates (colours, military, diplomatic, history)'
  }
}

const WHITE = '#ffffff'
const BLACK = '#111111'
const EV_GREEN = '#0b6b3a'
const YELLOW = '#ffd21f'
const BLUE = '#1d4ed8'
const RED = '#c1121f'
const DARK_GREEN = '#1f4d2b'

export type PlateKind = {
  id: string
  sample: PlateSampleSpec
  title: L10n
  text: L10n
}

export type PlateEra = PlateKind & {
  /** Display range, e.g. `1946-1958`. */
  years: string
}

/** What the face and character colours of a current plate say. */
export const COLOR_KINDS: PlateKind[] = [
  {
    id: 'standard',
    sample: { text: 'КА 1234 ВС', bg: WHITE, fg: BLACK, strip: 'ua' },
    title: { ua: 'Білий фон, чорні символи', ru: 'Белый фон, чёрные символы', en: 'White, black characters' },
    text: {
      ua: 'Звичайні знаки - для всіх приватних і службових авто, причепів і мотоциклів.',
      ru: 'Обычные знаки - для всех частных и служебных авто, прицепов и мотоциклов.',
      en: 'Ordinary plates for private and company cars, trailers and motorcycles.'
    }
  },
  {
    id: 'ev',
    sample: { text: 'КА 1234 ZA', bg: WHITE, fg: EV_GREEN, strip: 'ua' },
    title: { ua: 'Білий фон, зелені символи', ru: 'Белый фон, зелёные символы', en: 'White, green characters' },
    text: {
      ua: 'Електромобілі без двигуна внутрішнього згоряння. Серія з латинських літер, що починається з Z або Y.',
      ru: 'Электромобили без двигателя внутреннего сгорания. Серия из латинских букв, начинающаяся с Z или Y.',
      en: 'Electric vehicles with no combustion engine. The series is Latin letters starting with Z or Y.'
    }
  },
  {
    id: 'bus',
    sample: { text: 'КА 1234 AA', bg: YELLOW, fg: BLACK, strip: 'ua' },
    title: { ua: 'Жовтий фон, чорні символи', ru: 'Жёлтый фон, чёрные символы', en: 'Yellow, black characters' },
    text: {
      ua: 'Автобуси й мікроавтобуси з ліцензією на перевезення пасажирів (серія на A) та таксі (серія на T). Електробуси й електротаксі мають зелені символи.',
      ru: 'Автобусы и микроавтобусы с лицензией на перевозку пассажиров (серия на A) и такси (серия на T). У электробусов и электротакси символы зелёные.',
      en: 'Buses and minibuses licensed for passengers (series starting with A) and taxis (series starting with T). Electric buses and taxis have green characters.'
    }
  },
  {
    id: 'police',
    sample: { text: 'АА 1234 АА', bg: BLUE, fg: WHITE, strip: 'ua' },
    title: { ua: 'Синій фон, білі символи', ru: 'Синий фон, белые символы', en: 'Blue, white characters' },
    text: {
      ua: 'Національна поліція: автомобілі, причепи, самохідні машини, а також окремі знаки для мотоциклів.',
      ru: 'Национальная полиция: автомобили, прицепы, самоходные машины, а также отдельные знаки для мотоциклов.',
      en: 'National Police: cars, trailers, self-propelled machines, plus separate motorcycle plates.'
    }
  },
  {
    id: 'military',
    sample: { text: '1234 К5', bg: BLACK, fg: WHITE, strip: 'none' },
    title: { ua: 'Чорний фон, білі символи', ru: 'Чёрный фон, белые символы', en: 'Black, white characters' },
    text: {
      ua: 'Збройні сили та Державна спеціальна служба транспорту. Докладніше - у розділі про службові знаки нижче.',
      ru: 'Вооружённые силы и Государственная специальная служба транспорта. Подробнее - в разделе о служебных знаках ниже.',
      en: 'The Armed Forces and the State Special Transport Service. More in the service-plates section below.'
    }
  },
  {
    id: 'transit',
    sample: { text: 'АА 1234 AA', bg: RED, fg: WHITE, strip: 'none' },
    title: { ua: 'Червоний фон, білі символи', ru: 'Красный фон, белые символы', en: 'Red, white characters' },
    text: {
      ua: 'Транзитні знаки для разових поїздок і для авто, що рухаються від виробника чи автосалону; є й версії для мопедів, мотоциклів, тракторів і великотоннажної техніки.',
      ru: 'Транзитные знаки для разовых поездок и для авто, движущихся от производителя или автосалона; есть и версии для мопедов, мотоциклов, тракторов и крупнотоннажной техники.',
      en: 'Transit plates for one-off trips and for cars moving from a maker or dealer; versions exist for mopeds, motorcycles, tractors and heavy equipment.'
    }
  },
  {
    id: 'volunteer',
    sample: { text: 'АА 1234 AA', bg: DARK_GREEN, fg: WHITE, strip: 'ua' },
    title: {
      ua: 'Темно-зелений фон, білі символи',
      ru: 'Тёмно-зелёный фон, белые символы',
      en: 'Dark green, white characters'
    },
    text: {
      ua: 'Волонтерські номери - так їх називає лише один джерельний сайт; офіційних зразків ГСЦ для них ми не знайшли, тож розглядайте це як неофіційне позначення.',
      ru: 'Волонтёрские номера - так их называет лишь один источник; официальных образцов ГСЦ для них мы не нашли, так что считайте это неофициальным обозначением.',
      en: 'Volunteer plates - named so by only one source; we found no official HSC sample for them, so treat this as unofficial.'
    }
  }
]

/** Series letters of the 2020 standard (DSTU 3650-2019): the last two characters hint at the vehicle kind. */
export const SERIES_RULES: L10n[] = [
  {
    ua: 'Z або Y - електромобілі (зелені символи).',
    ru: 'Z или Y - электромобили (зелёные символы).',
    en: 'Z or Y - electric vehicles (green characters).'
  },
  {
    ua: 'X або F - причепи (окремий тип з 2020 року).',
    ru: 'X или F - прицепы (отдельный тип с 2020 года).',
    en: 'X or F - trailers (a separate type since 2020).'
  },
  {
    ua: 'A - автобуси, T - таксі (жовті знаки).',
    ru: 'A - автобусы, T - такси (жёлтые знаки).',
    en: 'A - buses, T - taxis (yellow plates).'
  },
  {
    ua: 'DI, PD - реєстрація через «Дію»; ED, DC - через електронний кабінет водія (без прив’язки до регіону).',
    ru: 'DI, PD - регистрация через «Дію»; ED, DC - через электронный кабинет водителя (без привязки к региону).',
    en: 'DI, PD - registered through Diia; ED, DC - through the driver’s e-cabinet (no region).'
  }
]

export const SERVICE_KINDS: PlateKind[] = [
  {
    id: 'military',
    sample: { text: '1234 К5', bg: BLACK, fg: WHITE, strip: 'none' },
    title: {
      ua: 'Військові знаки (ЗСУ та ДССТ)',
      ru: 'Военные знаки (ВСУ и ГССТ)',
      en: 'Military plates (Armed Forces, SSTS)'
    },
    text: {
      ua: 'Чорний знак: чотири цифри порядкового номера й два символи (літера + цифра), що показують належність до відомства. На відміну від звичайних знаків, тут використовують кириличні літери. У ЗСУ для автомобілів - літери А, В, Е, К, Н, Р, С, Т із цифрою 0-9, для причепів - І, М, О, Х; серед додаткових - Б, І, П. Державна спеціальна служба транспорту - поєднання Г2, Товариство сприяння обороні - Я1. Окремий тип є й для мотоциклів та тракторів (220×174 мм). Знаки Нацгвардії (раніше Ф4, Ф5), прикордонників (раніше Ю1-Ю7) і ДСНС (раніше Ч1-Ч3) з 2020 року перейшли на білі знаки з емблемою - див. «Відомчі» вище.',
      ru: 'Чёрный знак: четыре цифры порядкового номера и два символа (буква + цифра), показывающие принадлежность к ведомству. В отличие от обычных знаков, здесь используют кириллические буквы. В ВСУ для автомобилей - буквы А, В, Е, К, Н, Р, С, Т с цифрой 0-9, для прицепов - І, М, О, Х; среди дополнительных - Б, І, П. Государственная специальная служба транспорта - сочетание Г2, Общество содействия обороне - Я1. Отдельный тип есть и для мотоциклов и тракторов (220×174 мм). Знаки Нацгвардии (ранее Ф4, Ф5), пограничников (ранее Ю1-Ю7) и ГСЧС (ранее Ч1-Ч3) с 2020 года перешли на белые знаки с эмблемой - см. «Ведомственные» выше.',
      en: 'A black plate: four digits for the serial number and two characters (a letter plus a digit) showing the service. Unlike ordinary plates it uses Cyrillic letters. In the Armed Forces cars use the letters А, В, Е, К, Н, Р, С, Т with a digit 0-9, trailers І, М, О, Х; Б, І, П are extras. The State Special Transport Service uses Г2, the Defence Assistance Society Я1. A separate type covers motorcycles and tractors (220×174 mm). The National Guard (formerly Ф4, Ф5), border guard (formerly Ю1-Ю7) and civil-protection (formerly Ч1-Ч3) moved to white plates with an emblem in 2020 - see “Departmental” above.'
    }
  },
  {
    id: 'police',
    sample: { text: 'АА 1234 АА', bg: BLUE, fg: WHITE, strip: 'ua' },
    title: { ua: 'Національна поліція', ru: 'Национальная полиция', en: 'National Police' },
    text: {
      ua: 'Синій фон і білі символи. Окремі знаки для автомобілів, причепів і самохідних машин (520×112 мм) та для мотоциклів (220×174 мм). Синій колір МВС вперше з’явився на знаках у 2001 році.',
      ru: 'Синий фон и белые символы. Отдельные знаки для автомобилей, прицепов и самоходных машин (520×112 мм) и для мотоциклов (220×174 мм). Синий цвет МВД впервые появился на знаках в 2001 году.',
      en: 'Blue face, white characters. Separate plates for cars, trailers and self-propelled machines (520×112 mm) and for motorcycles (220×174 mm). The MIA blue first appeared on plates in 2001.'
    }
  },
  {
    id: 'diplomatic',
    sample: { text: 'DP 004 012', bg: WHITE, fg: BLACK, strip: 'none' },
    title: { ua: 'Дипломатичні знаки', ru: 'Дипломатические знаки', en: 'Diplomatic plates' },
    text: {
      ua: 'Білий фон без синьої смуги. Літери показують статус: CDP - глава представництва, DP - дипломатичний персонал і консульства, S - адміністративно-технічний персонал. Перші три цифри - код: 001-199 країна, 200-299 міжнародна організація, 300-399 консульська установа; решта цифр - порядковий номер авто за цим представництвом (код 004, наприклад, належить Сполученому Королівству). Знаки для мотоциклів - 220×174 мм.',
      ru: 'Белый фон без синей полосы. Буквы показывают статус: CDP - глава представительства, DP - дипломатический персонал и консульства, S - административно-технический персонал. Первые три цифры - код: 001-199 страна, 200-299 международная организация, 300-399 консульское учреждение; остальные цифры - порядковый номер авто по этому представительству (код 004, например, принадлежит Соединённому Королевству). Знаки для мотоциклов - 220×174 мм.',
      en: 'A white face with no blue strip. The letters give the status: CDP - head of mission, DP - diplomatic staff and consulates, S - administrative and technical staff. The first three digits are a code: 001-199 a country, 200-299 an international organisation, 300-399 a consular post; the remaining digits are the mission’s serial number for the car (code 004, for example, is the United Kingdom). Motorcycle plates are 220×174 mm.'
    }
  },
  {
    id: 'transit',
    sample: { text: 'АА 1234 AA', bg: RED, fg: WHITE, strip: 'none' },
    title: { ua: 'Транзитні знаки', ru: 'Транзитные знаки', en: 'Transit plates' },
    text: {
      ua: 'Червоний фон і білі символи: тип 2 - для автомобілів (разові поїздки та переміщення від виробника чи автосалону, 520×112 мм), окремі версії для мопедів (140×114), мотоциклів (220×174), тракторів (190×150) і великотоннажної техніки (140×114). До 2000 року транзити були паперовими і клеїлися під лобове скло; у 2004-2007 вони мали червоний фон і чорні символи.',
      ru: 'Красный фон и белые символы: тип 2 - для автомобилей (разовые поездки и перемещение от производителя или автосалона, 520×112 мм), отдельные версии для мопедов (140×114), мотоциклов (220×174), тракторов (190×150) и крупнотоннажной техники (140×114). До 2000 года транзиты были бумажными и клеились под лобовое стекло; в 2004-2007 они имели красный фон и чёрные символы.',
      en: 'Red face, white characters: type 2 is for cars (one-off trips and moves from a maker or dealer, 520×112 mm), with separate versions for mopeds (140×114), motorcycles (220×174), tractors (190×150) and heavy equipment (140×114). Until 2000 transit plates were paper stickers behind the windscreen; in 2004-2007 they had a red face and black characters.'
    }
  },
  {
    id: 'tractor',
    sample: { text: '12345 АБ', bg: WHITE, fg: BLACK, strip: 'none' },
    title: {
      ua: 'Трактори, великотоннажна техніка',
      ru: 'Тракторы, крупнотоннажная техника',
      en: 'Tractors and heavy equipment'
    },
    text: {
      ua: 'Трактори й сільгосптехніка мають знак 255×165 мм або довгий 520×112 мм (новий вид 2020 року); великотоннажний і технологічний транспорт - знак 288×226 мм у два ряди.',
      ru: 'Тракторы и сельхозтехника имеют знак 255×165 мм или длинный 520×112 мм (новый вид 2020 года); крупнотоннажный и технологический транспорт - знак 288×226 мм в два ряда.',
      en: 'Tractors and farm machinery carry a 255×165 mm plate or a long 520×112 mm one (new in 2020); heavy and technological vehicles carry a 288×226 mm two-line plate.'
    }
  }
]

/** Plates reserved for state bodies since 2008: series and number ranges inside ordinary plates, mostly Kyiv (АА, КА). */
export const GOVERNMENT_NOTE: L10n = {
  ua: 'Урядові номери. У 2004-2008 роках державні органи мали окремий тип знака з Тризубом зліва. Після 01.04.2008 його скасували й натомість зарезервували серії (дві останні літери) та діапазони цифр серед звичайних знаків, переважно київських (АА, КА). Приклади: …АА 0001-1000 - Секретаріат Президента, …ВВ 00хх / 29хх / 99хх - Державна охорона, …ВР і …КМ - Верховна Рада та Кабінет міністрів (серії ВР, КМ були й у 1995-2004), …ВС - Верховний суд. Така серія лише натякає на відомство: це не доказ того, чий автомобіль.',
  ru: 'Правительственные номера. В 2004-2008 годах государственные органы имели отдельный тип знака с Трезубцем слева. После 01.04.2008 его отменили и вместо него зарезервировали серии (две последние буквы) и диапазоны цифр среди обычных знаков, преимущественно киевских (АА, КА). Примеры: …АА 0001-1000 - Секретариат Президента, …ВВ 00хх / 29хх / 99хх - Государственная охрана, …ВР и …КМ - Верховная Рада и Кабинет министров (серии ВР, КМ были и в 1995-2004), …ВС - Верховный суд. Такая серия лишь намекает на ведомство: это не доказательство того, чей автомобиль.',
  en: 'Government plates. In 2004-2008 state bodies had a separate plate type with the Trident on the left. After 1 April 2008 it was abolished and series (the last two letters) and number ranges inside ordinary plates, mostly Kyiv (АА, КА), were reserved instead. Examples: …АА 0001-1000 - the Presidential Secretariat, …ВВ 00xx / 29xx / 99xx - State Protection, …ВР and …КМ - Parliament and the Cabinet (ВР, КМ series also existed in 1995-2004), …ВС - the Supreme Court. Such a series only hints at a body: it is no proof of whose car it is.'
}

/** A few diplomatic codes as examples; the full table has ~100 entries and is not reproduced. */
export const DIPLOMATIC_CODES: { code: string; name: L10n }[] = [
  { code: '002', name: { ua: 'США', ru: 'США', en: 'United States' } },
  { code: '004', name: { ua: 'Велика Британія', ru: 'Великобритания', en: 'United Kingdom' } },
  { code: '005', name: { ua: 'Франція', ru: 'Франция', en: 'France' } },
  { code: '006', name: { ua: 'Німеччина', ru: 'Германия', en: 'Germany' } },
  { code: '014', name: { ua: 'Польща', ru: 'Польша', en: 'Poland' } },
  { code: '051', name: { ua: 'ООН', ru: 'ООН', en: 'United Nations' } }
]

/** Plate generations, oldest first. Samples only show the layout and colours of each era. */
export const ERAS: PlateEra[] = [
  {
    id: 'ussr-1946',
    years: '1946-1958',
    sample: { text: 'КИ 12-34', bg: YELLOW, fg: BLACK, strip: 'none' },
    title: { ua: 'Жовті знаки УРСР', ru: 'Жёлтые знаки УССР', en: 'Yellow Soviet plates' },
    text: {
      ua: 'ГОСТ 3207-46: жовтий фон, чорні символи, дві літери регіону й чотири цифри, розділені дефісом; на причепах - напис «ПРИЦЕП».',
      ru: 'ГОСТ 3207-46: жёлтый фон, чёрные символы, две буквы региона и четыре цифры, разделённые дефисом; на прицепах - надпись «ПРИЦЕП».',
      en: 'GOST 3207-46: yellow face, black characters, two region letters and four digits split by a hyphen; trailers added the word “ПРИЦЕП”.'
    }
  },
  {
    id: 'ussr-1958',
    years: '1958-1977',
    sample: { text: '12-34 КИ', bg: BLACK, fg: WHITE, strip: 'none' },
    title: { ua: 'Чорні знаки', ru: 'Чёрные знаки', en: 'Black plates' },
    text: {
      ua: 'ГОСТ 3207-58: чорний фон, білі символи. Такі знаки, видані з 1958 року, досі легальні й трапляються на дорогах. У 1965 році для тракторів і самохідних машин з’явився жовтий знак із написами «ТР-Р» і «ПР-П».',
      ru: 'ГОСТ 3207-58: чёрный фон, белые символы. Такие знаки, выданные с 1958 года, до сих пор легальны и встречаются на дорогах. В 1965 году для тракторов и самоходных машин появился жёлтый знак с надписями «ТР-Р» и «ПР-П».',
      en: 'GOST 3207-58: black face, white characters. Plates issued from 1958 are still legal and still seen on the road. In 1965 tractors and self-propelled machines got a yellow plate marked “ТР-Р” and “ПР-П”.'
    }
  },
  {
    id: 'ussr-1977',
    years: '1977-1992',
    sample: { text: '12-34 КИА', bg: WHITE, fg: BLACK, strip: 'none' },
    title: { ua: 'Перші білі знаки', ru: 'Первые белые знаки', en: 'The first white plates' },
    text: {
      ua: 'ГОСТ 3207-77: усі цивільні знаки з білим фоном і чорними символами, військові лишилися чорними. Три літери й чотири цифри; для причепів і тракторів - шестикутний знак у вигляді перевернутої трапеції.',
      ru: 'ГОСТ 3207-77: все гражданские знаки с белым фоном и чёрными символами, военные остались чёрными. Три буквы и четыре цифры; для прицепов и тракторов - шестиугольный знак в виде перевёрнутой трапеции.',
      en: 'GOST 3207-77: all civilian plates white with black characters, military ones stayed black. Three letters and four digits; trailers and tractors got a six-sided, inverted-trapezoid plate.'
    }
  },
  {
    id: 'ua-1992',
    years: '1992-1995',
    sample: { text: '12-34 КИА', bg: WHITE, fg: BLACK, strip: 'flag' },
    title: {
      ua: 'Перші знаки незалежної України',
      ru: 'Первые знаки независимой Украины',
      en: 'First independent plates'
    },
    text: {
      ua: 'ТУ 5701-039-3-92: радянська основа, але ліворуч з’явилися прапор і «UA», а в коді регіону - українська «І». Дипломатичні знаки (CDP, DP, S) були на червоному тлі, для нерезидентів - жовті (F, C, B). Транзити були паперовими.',
      ru: 'ТУ 5701-039-3-92: советская основа, но слева появились флаг и «UA», а в коде региона - украинская «І». Дипломатические знаки (CDP, DP, S) были на красном фоне, для нерезидентов - жёлтые (F, C, B). Транзиты были бумажными.',
      en: 'TU 5701-039-3-92: the Soviet layout with a flag and “UA” added on the left, and the Ukrainian “І” in region codes. Diplomatic plates (CDP, DP, S) were red, non-residents’ were yellow (F, C, B). Transit plates were paper.'
    }
  },
  {
    id: 'ua-1995',
    years: '1995-2004',
    sample: { text: '12345 КИ', bg: WHITE, fg: BLACK, strip: 'flag', code: '11' },
    title: { ua: 'П’ятизначні знаки', ru: 'Пятизначные знаки', en: 'Five-digit plates' },
    text: {
      ua: 'ДСТУ 2588-94: п’ять цифр і дві літери в кінці; регіон позначався цифровим кодом під прапором (на ньому ж літери в кінці). Літеру «Я» більше не вживали. Вперше з’явилося світловідбивне покриття з голограмами; були й урядові знаки з літерами АП, ВР, КМ. З 2001 року - сині знаки МВС, жовті для таксі й маршруток та індивідуальні.',
      ru: 'ДСТУ 2588-94: пять цифр и две буквы в конце; регион обозначался цифровым кодом под флагом (и буквами в конце). Букву «Я» больше не использовали. Впервые появилось светоотражающее покрытие с голограммами; были и правительственные знаки с буквами АП, ВР, КМ. С 2001 года - синие знаки МВД, жёлтые для такси и маршруток и индивидуальные.',
      en: 'DSTU 2588-94: five digits and two letters at the end; the region was a digit code under the flag (and the letters at the end). The letter “Я” was no longer used. Reflective film with holograms appeared; government plates carried АП, ВР, КМ. From 2001 came blue MIA plates, yellow ones for taxis and minibuses, and custom plates.'
    }
  },
  {
    id: 'ua-2004',
    years: '2004-2015',
    sample: { text: 'КА 1234 ВС', bg: WHITE, fg: BLACK, strip: 'old' },
    title: { ua: 'Нинішній формат: 8 символів', ru: 'Нынешний формат: 8 символов', en: 'The 8-character format' },
    text: {
      ua: 'ДСТУ 3650-2004: дві літери регіону, чотири цифри, дві літери серії; ліворуч синьо-жовта смуга з Тризубом і «UA». Лише латиниця, що збігається з кирилицею. Кольори за призначенням: жовтий - автобуси й маршрутки, синій - МВС, червоний - транзит, чорний - Міноборони й МНС. З’явилися знаки під американський розмір 300×150 мм, а в 2011 році - для мопедів.',
      ru: 'ДСТУ 3650-2004: две буквы региона, четыре цифры, две буквы серии; слева сине-жёлтая полоса с Трезубцем и «UA». Только латиница, совпадающая с кириллицей. Цвета по назначению: жёлтый - автобусы и маршрутки, синий - МВД, красный - транзит, чёрный - Минобороны и МЧС. Появились знаки под американский размер 300×150 мм, а в 2011 году - для мопедов.',
      en: 'DSTU 3650-2004: two region letters, four digits, two series letters; a blue-and-yellow strip with the Trident and “UA” on the left. Only letters shared by Latin and Cyrillic. Colours by use: yellow - buses and minibuses, blue - MIA, red - transit, black - Defence and Emergencies. 300×150 mm “American” plates appeared, and mopeds got plates in 2011.'
    }
  },
  {
    id: 'ua-2015',
    years: '2015-2020',
    sample: { text: 'КА 1234 ВС', bg: WHITE, fg: BLACK, strip: 'ua' },
    title: {
      ua: 'Синя смуга за європейським зразком',
      ru: 'Синяя полоса по европейскому образцу',
      en: 'The EU-style blue strip'
    },
    text: {
      ua: 'ДСТУ 3650-2012 (знаки видають з квітня 2015): смуга стала повністю синьою - угорі прапор, внизу «UA». На мотоциклах і знаках під американський розмір смуга займає половину висоти. На дипломатичних знаках повернули CDP, DP, S; з’явився транзит для тракторів. У 2018 році через вичерпання комбінацій додали нові коди регіонів (КА, КМ тощо).',
      ru: 'ДСТУ 3650-2012 (знаки выдают с апреля 2015): полоса стала полностью синей - вверху флаг, внизу «UA». На мотоциклах и знаках под американский размер полоса занимает половину высоты. На дипломатических знаках вернули CDP, DP, S; появился транзит для тракторов. В 2018 году из-за исчерпания комбинаций добавили новые коды регионов (КА, КМ и т. д.).',
      en: 'DSTU 3650-2012 (issued from April 2015): the strip became fully blue - flag on top, “UA” below. On motorcycle and “American” plates it covers half the height. Diplomatic plates regained CDP, DP, S; tractors got a transit plate. In 2018, as combinations ran out, new region codes were added (КА, КМ and so on).'
    }
  },
  {
    id: 'ua-2020',
    years: '2020+',
    sample: { text: 'КА 1234 ZA', bg: WHITE, fg: EV_GREEN, strip: 'ua' },
    title: {
      ua: 'Стандарт 2019: електромобілі й нові типи',
      ru: 'Стандарт 2019: электромобили и новые типы',
      en: 'The 2019 standard: EVs and new types'
    },
    text: {
      ua: 'ДСТУ 3650-2019 і 4278-2019 (видаються з 16.03.2020): вигляд звичайних знаків не змінився, але додано знаки для електромобілів, причепів, електробусів і електротаксі, довгі знаки для тракторів, свій тип для ДПСУ, Нацгвардії та ДСНС, а в індивідуальних - новий шрифт. Серія тепер може бути латинською. Із 2023 року додалися серії DI, PD, ED, DC.',
      ru: 'ДСТУ 3650-2019 и 4278-2019 (выдаются с 16.03.2020): вид обычных знаков не изменился, но добавлены знаки для электромобилей, прицепов, электробусов и электротакси, длинные знаки для тракторов, свой тип для ГПСУ, Нацгвардии и ГСЧС, а в индивидуальных - новый шрифт. Серия теперь может быть латинской. С 2023 года добавились серии DI, PD, ED, DC.',
      en: 'DSTU 3650-2019 and 4278-2019 (issued from 16 March 2020): ordinary plates look the same, but EV, trailer, electric-bus and electric-taxi plates were added, plus long tractor plates, their own type for the Border Guard, National Guard and Emergency Service, and a new typeface for custom plates. The series may now be Latin. Since 2023 the DI, PD, ED and DC series were added.'
    }
  }
]

export const OCCUPATION_NOTE: L10n = {
  ua: 'Найстаріші відомі номери: у Києві 1917 року - три цифри й одна літера. У 1941-1945 роках, під німецькою окупацією («Райхскомісаріат Україна»), діяли німецькі знаки з серіями RKU (1941-1942) і RU (з 1942).',
  ru: 'Самые старые известные номера: в Киеве 1917 года - три цифры и одна буква. В 1941-1945 годах, при немецкой оккупации («Рейхскомиссариат Украина»), действовали немецкие знаки с сериями RKU (1941-1942) и RU (с 1942).',
  en: 'The oldest known plates: Kyiv in 1917, three digits and one letter. In 1941-1945, under German occupation (“Reichskommissariat Ukraine”), German plates with the series RKU (1941-1942) and RU (from 1942) were used.'
}
