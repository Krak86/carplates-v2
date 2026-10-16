import type { L10n } from '@/routes/read/types'

/** Why a model gets bigger from one generation to the next. */
export const WHY_REASONS: ReadonlyArray<{ title: L10n; text: L10n }> = [
  {
    title: { ua: 'Безпека', ru: 'Безопасность', en: 'Safety' },
    text: {
      ua: 'Зони деформації, подушки безпеки й захист пішоходів потребують місця: передок стає довшим і вищим.',
      ru: 'Зоны деформации, подушки безопасности и защита пешеходов требуют места: передок становится длиннее и выше.',
      en: 'Crumple zones, airbags and pedestrian protection need room, so the nose gets longer and taller.'
    }
  },
  {
    title: { ua: 'Простір і комфорт', ru: 'Простор и комфорт', en: 'Space and comfort' },
    text: {
      ua: 'Покупці звикли до просторого заднього ряду й великого багажника, тож колісна база й ширина ростуть разом із очікуваннями.',
      ru: 'Покупатели привыкли к просторному заднему ряду и большому багажнику, поэтому колёсная база и ширина растут вместе с ожиданиями.',
      en: 'Buyers expect a roomy rear seat and a big boot, so wheelbase and width grow with expectations.'
    }
  },
  {
    title: { ua: 'Зсув класу', ru: 'Сдвиг класса', en: 'Class creep' },
    text: {
      ua: 'Щойно модель виростає, під нею з’являється менша — і стара ніша заповнюється новачком.',
      ru: 'Как только модель вырастает, под ней появляется меньшая — и старая ниша заполняется новичком.',
      en: 'Once a model grows, a smaller one is slotted underneath it to refill the old niche.'
    }
  },
  {
    title: { ua: 'Спільні платформи', ru: 'Общие платформы', en: 'Shared platforms' },
    text: {
      ua: 'Одна платформа обслуговує кілька моделей, тому розміри міняються сходинками — між поколіннями, а не всередині одного.',
      ru: 'Одна платформа обслуживает несколько моделей, поэтому размеры меняются ступенями — между поколениями, а не внутри одного.',
      en: 'One platform serves several models, so sizes change in steps — between generations, not inside one.'
    }
  }
]

/** The models behind the cards (registry spelling; a model the data cannot size is skipped). Order = page order. */
export const GROWTH_MODELS: ReadonlyArray<{ brand: string; model: string; note: L10n }> = [
  {
    brand: 'SKODA',
    model: 'OCTAVIA',
    note: {
      ua: 'Одна з найпоширеніших моделей в Україні — і майже зразкова історія «з компакта в середній клас».',
      ru: 'Одна из самых распространённых моделей в Украине — и почти образцовая история «из компакта в средний класс».',
      en: 'One of the most common models in Ukraine, and nearly a textbook “compact to mid-size” story.'
    }
  },
  {
    brand: 'VOLKSWAGEN',
    model: 'GOLF',
    note: {
      ua: 'Еталонний хетчбек: кожне покоління трохи більше за попереднє.',
      ru: 'Эталонный хэтчбек: каждое поколение немного больше предыдущего.',
      en: 'The benchmark hatchback: every generation a little bigger than the last.'
    }
  },
  {
    brand: 'VOLKSWAGEN',
    model: 'PASSAT',
    note: {
      ua: 'Найпоширеніша модель реєстру: від компактного седана 1970-х до майже представницького розміру.',
      ru: 'Самая распространённая модель реестра: от компактного седана 1970-х до почти представительского размера.',
      en: 'The registry’s most common model: from a compact 1970s sedan to nearly executive size.'
    }
  },
  {
    brand: 'TOYOTA',
    model: 'CAMRY',
    note: {
      ua: 'Колісна база відома майже для всіх поколінь, а довжина — лише там, де вистачає даних RDW.',
      ru: 'Колёсная база известна почти для всех поколений, а длина — только там, где хватает данных RDW.',
      en: 'Wheelbase is known for nearly every generation; length only where RDW has enough data.'
    }
  },
  {
    brand: 'HONDA',
    model: 'CIVIC',
    note: {
      ua: 'Від невеликого хетчбека 1980-х до авто, що за довжиною близьке до седанів середнього класу.',
      ru: 'От небольшого хэтчбека 1980-х до авто, по длине близкого к седанам среднего класса.',
      en: 'From a small 1980s hatch to a car close to mid-size sedans in length.'
    }
  },
  {
    brand: 'FORD',
    model: 'FOCUS',
    note: {
      ua: 'Другий Focus одразу став помітно більшим за перший — класичний стрибок між поколіннями.',
      ru: 'Второй Focus сразу стал заметно больше первого — классический скачок между поколениями.',
      en: 'The second Focus was clearly bigger than the first: a classic jump between generations.'
    }
  },
  {
    brand: 'HYUNDAI',
    model: 'TUCSON',
    note: {
      ua: 'Кросовери ростуть повільніше за хетчбеки, але стабільно — і шириною, і колісною базою.',
      ru: 'Кроссоверы растут медленнее хэтчбеков, но стабильно — и шириной, и колёсной базой.',
      en: 'Crossovers grow more slowly than hatchbacks, but steadily — in width and wheelbase alike.'
    }
  },
  {
    brand: 'AUDI',
    model: 'A4',
    note: {
      ua: 'Найбільша сходинка — між B7 і B8: колісна база за одне покоління зросла приблизно на 15 см.',
      ru: 'Самая большая ступенька — между B7 и B8: колёсная база за одно поколение выросла примерно на 15 см.',
      en: 'The big step is B7 to B8: the wheelbase gained about 15 cm in a single generation.'
    }
  }
]

export const METHOD_POINTS: readonly L10n[] = [
  {
    ua: 'Розмір покоління — це медіана за модельними роками, що потрапляють у його роки виробництва, за типовими даними RDW (Нідерланди). Де в RDW немає даних, беремо каталожні значення з Вікіпедії.',
    ru: 'Размер поколения — это медиана по модельным годам, попадающим в его годы производства, по типовым данным RDW (Нидерланды). Где в RDW нет данных, берём каталожные значения из Википедии.',
    en: 'A generation’s size is the median over the model years inside its production span, from RDW (Netherlands) type data. Where RDW has none, catalogue values from Wikipedia fill in.'
  },
  {
    ua: 'Рік, спільний для двох поколінь, належить новішому. Прочерк у таблиці означає, що надійних даних немає, а не що авто «без розміру».',
    ru: 'Год, общий для двух поколений, относится к более новому. Прочерк в таблице означает, что надёжных данных нет, а не что у авто «нет размера».',
    en: 'A year shared by two generations goes to the newer one. A dash in the table means there is no reliable figure, not that the car has no size.'
  },
  {
    ua: 'Це значення для покоління загалом, а не для вашого авто: кузов, рестайлінг і ринок можуть змінювати довжину на кілька сантиметрів.',
    ru: 'Это значения для поколения в целом, а не для вашего авто: кузов, рестайлинг и рынок могут менять длину на несколько сантиметров.',
    en: 'These are figures for the generation as a whole, not for your car: body style, facelift and market can move the length by a few centimetres.'
  }
]
