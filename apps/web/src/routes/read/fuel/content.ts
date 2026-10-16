import type { L10n } from '@/routes/read/types'

export const MIX_NOTE: L10n = {
  ua: 'Паливо береться з реєстраційних документів. Гібриди й плагіни (PHEV) тут в одному класі, а «Невідомо» - це авто, в яких паливо не вказане або не розпізнане.',
  ru: 'Топливо берётся из регистрационных документов. Гибриды и плагины (PHEV) здесь в одном классе, а «Неизвестно» - это авто, у которых топливо не указано или не распознано.',
  en: 'The fuel comes from the registration records. Hybrids and plug-ins (PHEV) share one class here, and “Unknown” is the cars whose fuel is missing or not recognised.'
}

export const DISTRIBUTION_NOTE: L10n = {
  ua: 'Колір стовпчика - діапазон викидів: зелений до 75 г/км, жовтий 75–149, помаранчевий 150–224, червоний від 225. Чисті електромобілі (0 г/км) - у крайньому лівому стовпчику.',
  ru: 'Цвет столбика - диапазон выбросов: зелёный до 75 г/км, жёлтый 75–149, оранжевый 150–224, красный от 225. Чистые электромобили (0 г/км) - в крайнем левом столбике.',
  en: 'A column’s colour is its emissions range: green under 75 g/km, yellow 75–149, orange 150–224, red 225 and up. Pure electric cars (0 g/km) sit in the leftmost column.'
}

export const YEARS_NOTE: L10n = {
  ua: 'Рік - це рік випуску авто. Показано лише роки, де оцінку мають щонайменше тисяча авто. На середнє також впливає склад парку: чим більше ввезених електромобілів і гібридів, тим нижчий показник року.',
  ru: 'Год - это год выпуска авто. Показаны только годы, где оценку имеют как минимум тысяча авто. На среднее также влияет состав парка: чем больше ввезённых электромобилей и гибридов, тем ниже показатель года.',
  en: 'The year is the car’s model year. Only years where at least a thousand cars have an estimate are drawn. The mix of the fleet matters as well: the more imported electric cars and hybrids a year has, the lower its average.'
}

export const MODELS_NOTE: L10n = {
  ua: 'У списки потрапляють моделі, яких зареєстровано багато. Електромобілі з 0 г/км тут не змагаються між собою, тому серед найчистіших зазвичай стоять поширені гібриди та економні бензинові авто.',
  ru: 'В списки попадают модели, которых зарегистрировано много. Электромобили с 0 г/км здесь не соревнуются между собой, поэтому среди самых чистых обычно стоят распространённые гибриды и экономичные бензиновые авто.',
  en: 'Only models with many registered cars are listed. Electric cars at 0 g/km do not compete with each other here, so the cleanest list is usually common hybrids and frugal petrol cars.'
}

export type Method = { key: 'source' | 'match' | 'tailpipe' | 'cycle'; text: L10n }

export const METHOD: readonly Method[] = [
  {
    key: 'source',
    text: {
      ua: 'Українські реєстри не містять викидів CO₂, тому ми беремо їх із двох відкритих баз: американської EPA (fueleconomy.gov) та європейської EEA (WLTP з 2018/19 року, NEDC раніше).',
      ru: 'Украинские реестры не содержат выбросов CO₂, поэтому мы берём их из двух открытых баз: американской EPA (fueleconomy.gov) и европейской EEA (WLTP с 2018/19 года, NEDC раньше).',
      en: 'Ukrainian registries do not record CO₂, so we take it from two open datasets: the American EPA (fueleconomy.gov) and the European EEA (WLTP from 2018/19, NEDC before).'
    }
  },
  {
    key: 'match',
    text: {
      ua: 'Авто зіставляється з рядком бази за маркою, моделлю, роком, паливом і об’ємом двигуна (±12%). Це оцінка для типової комплектації, а не вимір вашого авто; коли збігів кілька, береться діапазон.',
      ru: 'Авто сопоставляется со строкой базы по марке, модели, году, топливу и объёму двигателя (±12%). Это оценка для типовой комплектации, а не замер вашего авто; когда совпадений несколько, берётся диапазон.',
      en: 'A car is matched to a row by make, model, year, fuel and engine size (±12%). It is an estimate for a typical trim, not a measurement of your car; when several rows match, a range is used.'
    }
  },
  {
    key: 'tailpipe',
    text: {
      ua: 'Рахуються лише викиди з вихлопної труби. Електромобіль має 0 г/км, хоча електроенергію для нього теж десь виробляють, а виготовлення авто й пального до цієї цифри не входить.',
      ru: 'Считаются только выбросы из выхлопной трубы. У электромобиля 0 г/км, хотя электроэнергию для него тоже где-то вырабатывают, а производство авто и топлива в эту цифру не входит.',
      en: 'Only tailpipe emissions count. An electric car shows 0 g/km although its electricity is generated somewhere too, and building the car or refining the fuel is not in the number.'
    }
  },
  {
    key: 'cycle',
    text: {
      ua: 'Цифри з лабораторних циклів (NEDC, WLTP, EPA). У реальному русі викиди зазвичай вищі, особливо в гібридів-плагінів, коли їх рідко заряджають.',
      ru: 'Цифры из лабораторных циклов (NEDC, WLTP, EPA). В реальном движении выбросы обычно выше, особенно у плагин-гибридов, когда их редко заряжают.',
      en: 'The figures come from laboratory cycles (NEDC, WLTP, EPA). On the road emissions are usually higher, especially for plug-in hybrids that are rarely charged.'
    }
  }
]
