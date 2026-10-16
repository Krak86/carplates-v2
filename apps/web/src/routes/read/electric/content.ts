import type { L10n } from '@/routes/read/types'

export const WHAT_COUNTS: L10n = {
  ua: 'У реєстрі паливо - це текст. «ЕЛЕКТРО» без нічого іншого - електромобіль (BEV). «ЕЛЕКТРО» поруч із бензином, дизелем чи газом - гібрид; реєстр не розрізняє підзаряджувані (PHEV) та звичайні гібриди, тож рахуємо їх разом. Дані - про авто, що зараз на обліку, і згруповані за роком випуску, а не за роком ввезення.',
  ru: 'В реестре топливо - это текст. «ЕЛЕКТРО» без ничего другого - электромобиль (BEV). «ЕЛЕКТРО» рядом с бензином, дизелем или газом - гибрид; реестр не отличает подзаряжаемые (PHEV) от обычных гибридов, поэтому считаем их вместе. Данные - об авто, которые сейчас на учёте, и сгруппированы по году выпуска, а не по году ввоза.',
  en: 'In the registry, fuel is free text. “ЕЛЕКТРО” on its own is a battery-electric car (BEV). “ЕЛЕКТРО” next to petrol, diesel or gas is a hybrid; the registry cannot tell plug-in (PHEV) from self-charging hybrids, so they are counted together. The figures are for cars currently registered and grouped by model year, not by the year they were imported.'
}

export const YEARS_NOTE: L10n = {
  ua: 'Більшість електромобілів в Україні - вживані, ввезені з-за кордону, тому стовпчик року випуску показує, які покоління «вживаних електричок» дійшли до нас. Правила оподаткування ввезення електромобілів змінювалися, тож перевіряйте актуальні умови митного оформлення.',
  ru: 'Большинство электромобилей в Украине - подержанные, ввезённые из-за рубежа, поэтому столбец года выпуска показывает, какие поколения «б/у электричек» добрались до нас. Правила налогообложения ввоза электромобилей менялись, поэтому проверяйте актуальные условия растаможки.',
  en: 'Most electric cars in Ukraine are used imports, so the model-year bars show which generations of second-hand EVs made it here. The tax rules for importing electric cars have changed over time, so check the current customs conditions.'
}

export type Plug = { name: string; text: L10n }

export const PLUGS: readonly Plug[] = [
  {
    name: 'Type 2 (AC)',
    text: {
      ua: 'Звичайна зарядка змінним струмом у Європі - домашня станція й більшість міських зарядок. Такий роз’єм мають європейські авто.',
      ru: 'Обычная зарядка переменным током в Европе - домашняя станция и большинство городских зарядок. Такой разъём есть у европейских авто.',
      en: 'Normal AC charging in Europe: the home wallbox and most city chargers. European cars have it.'
    }
  },
  {
    name: 'Type 1 (J1772) / CCS1',
    text: {
      ua: 'Американський варіант. Авто з США та Канади мають Type 1 і CCS1, тому для європейських станцій потрібен перехідник, а швидку зарядку CCS1 в Україні знайти важче.',
      ru: 'Американский вариант. Авто из США и Канады имеют Type 1 и CCS1, поэтому для европейских станций нужен переходник, а быструю зарядку CCS1 в Украине найти сложнее.',
      en: 'The North American variant. Cars from the US and Canada have Type 1 and CCS1, so European stations need an adapter and CCS1 fast charging is harder to find in Ukraine.'
    }
  },
  {
    name: 'CCS2',
    text: {
      ua: 'Стандарт швидкої зарядки постійним струмом у Європі: Type 2 з двома додатковими контактами. Найпоширеніший на нових станціях.',
      ru: 'Стандарт быстрой зарядки постоянным током в Европе: Type 2 с двумя дополнительными контактами. Самый распространённый на новых станциях.',
      en: 'The European DC fast-charging standard: a Type 2 plug with two extra pins. The most common on newer stations.'
    }
  },
  {
    name: 'CHAdeMO',
    text: {
      ua: 'Японський стандарт швидкої зарядки - його мають ранні Nissan Leaf. Станцій з CHAdeMO стає менше, тож перед купівлею перевірте, де ви заряджатиметеся.',
      ru: 'Японский стандарт быстрой зарядки - он у ранних Nissan Leaf. Станций с CHAdeMO становится меньше, поэтому перед покупкой проверьте, где вы будете заряжаться.',
      en: 'The Japanese fast-charging standard, found on early Nissan Leafs. CHAdeMO stations are getting rarer, so check where you would charge before buying.'
    }
  },
  {
    name: 'GB/T',
    text: {
      ua: 'Китайський стандарт. Авто, зроблені для ринку Китаю, мають його замість CCS2, тож знадобиться перехідник, а швидкі станції GB/T в Україні трапляються рідко.',
      ru: 'Китайский стандарт. Авто, сделанные для рынка Китая, имеют его вместо CCS2, поэтому понадобится переходник, а быстрые станции GB/T в Украине встречаются редко.',
      en: 'The Chinese standard. Cars built for the Chinese market have it instead of CCS2, so you would need an adapter, and fast GB/T stations are rare in Ukraine.'
    }
  }
]
