import type { L10n } from '@/routes/read/types'

// Facts below come from the sources in `SOURCES` (IDA / eauto.org.ua 2021-2024, TSN 2021, AEC Solutions). They are dated:
// the copy names the year of every figure and never says what the rules are today (no tax / customs specifics).

export type TimelineItem = { when: L10n; text: L10n }

export const HISTORY_INTRO: L10n = {
  ua: 'Ввезення вживаних авто - не українська вигадка: у світі автомобілі возили з країни в країну майже відтоді, як вони з’явились. В Україні ж воно зросло до масштабів, яких не мав майже ніхто, і мало на це свої причини.',
  ru: 'Ввоз подержанных авто - не украинское изобретение: в мире автомобили возили из страны в страну почти с тех пор, как они появились. В Украине же он вырос до масштабов, каких почти ни у кого не было, и на это были свои причины.',
  en: 'Importing used cars is not a Ukrainian invention: cars have crossed borders almost since they were invented. Ukraine, though, grew it to a scale few countries match, and for reasons of its own.'
}

export const HISTORY: TimelineItem[] = [
  {
    when: { ua: 'Початок 1900-х', ru: 'Начало 1900-х', en: 'Early 1900s' },
    text: {
      ua: 'Європейські марки (Voisin, Delahaye, Hispano-Suiza, Horch) будують розкішні авто для багатих, і їх купують по всьому світу. Імпорт тоді - це привілей, а не економія.',
      ru: 'Европейские марки (Voisin, Delahaye, Hispano-Suiza, Horch) строят роскошные авто для богатых, и их покупают по всему миру. Импорт тогда - это привилегия, а не экономия.',
      en: 'European makes (Voisin, Delahaye, Hispano-Suiza, Horch) build luxury cars for the wealthy, and buyers worldwide order them. Importing is a privilege then, not a saving.'
    }
  },
  {
    when: { ua: '1950-ті', ru: '1950-е', en: '1950s' },
    text: {
      ua: 'Імпортер Макс Гоффман переконує Mercedes, Porsche і BMW робити моделі спеціально для американців, яким набридли великі «хромовані» седани. Так з’являються Mercedes 300 SL «Gullwing» і Porsche 356 America Roadster: імпорт стає способом отримати авто, якого немає вдома.',
      ru: 'Импортёр Макс Хоффман убеждает Mercedes, Porsche и BMW делать модели специально для американцев, которым надоели большие «хромированные» седаны. Так появляются Mercedes 300 SL «Gullwing» и Porsche 356 America Roadster: импорт становится способом получить авто, которого нет дома.',
      en: 'The importer Max Hoffman persuades Mercedes, Porsche and BMW to build models for Americans tired of big chrome-laden sedans. That gives the Mercedes 300 SL “Gullwing” and the Porsche 356 America Roadster: importing becomes a way to get a car that is not sold at home.'
    }
  },
  {
    when: { ua: '1997-2015', ru: '1997-2015', en: '1997-2015' },
    text: {
      ua: 'За 18 років офіційно розмитнили лише близько 75 тисяч вживаних авто. Високі збори штовхали людей до «євробляхи» - авто з іноземними номерами, що їздили без українських зборів: у 2015 році їх було близько 600 тисяч.',
      ru: 'За 18 лет официально растаможили лишь около 75 тысяч подержанных авто. Высокие сборы толкали людей к «евробляхам» - авто с иностранными номерами, ездившим без украинских сборов: в 2015 году их было около 600 тысяч.',
      en: 'In 18 years only about 75,000 used cars were cleared officially. High charges pushed people towards “euroblyakhy”, cars on foreign plates driven without Ukrainian charges: about 600,000 of them in 2015.'
    }
  },
  {
    when: { ua: '2016-2018', ru: '2016-2018', en: '2016-2018' },
    text: {
      ua: 'Акциз на авто до 2010 року випуску прирівняли до ставок для нових, а наприкінці 2018-го вимогу Євро-5 замінили на Євро-2 і ввели нову формулу акцизу за об’ємом двигуна й віком. Ввезення вживаних авто стало масовішим: у 2017-му - понад 70 тисяч легковиків.',
      ru: 'Акциз на авто до 2010 года выпуска приравняли к ставкам для новых, а в конце 2018-го требование Евро-5 заменили на Евро-2 и ввели новую формулу акциза по объёму двигателя и возрасту. Ввоз подержанных авто стал массовее: в 2017-м - более 70 тысяч легковых.',
      en: 'Excise on cars older than model year 2010 was set equal to the rates for new ones, and in late 2018 the Euro-5 requirement was replaced by Euro-2 with a new excise formula based on engine size and age. Importing used cars became more common: over 70,000 passenger cars in 2017.'
    }
  },
  {
    when: { ua: '2021', ru: '2021', en: '2021' },
    text: {
      ua: 'Рекорд: близько 533 тисяч ввезених вживаних авто проти 107,8 тисячі нових і 945 тисяч перепродажів усередині країни. Нові авто - лише 6,7% угод. З кінця 2021 до лютого 2022 ввозили по 40-50 тисяч легковиків на місяць.',
      ru: 'Рекорд: около 533 тысяч ввезённых подержанных авто против 107,8 тысячи новых и 945 тысяч перепродаж внутри страны. Новые авто - лишь 6,7% сделок. С конца 2021 до февраля 2022 ввозили по 40-50 тысяч легковых в месяц.',
      en: 'A record: about 533,000 used cars imported, against 107,800 new ones and 945,000 resales inside the country. New cars were only 6.7% of transactions. From late 2021 to February 2022, 40,000-50,000 passenger cars came in every month.'
    }
  },
  {
    when: { ua: '2022', ru: '2022', en: '2022' },
    text: {
      ua: 'У березні парламент тимчасово звільнив ввезення авто від митних платежів на час воєнного стану. До кінця травня за цією нормою ввезли близько 130 тисяч авто: у середньому 14-річних, здебільшого 2003-2007 років, із середньою митною вартістю близько 4,6 тисячі доларів. Найчастіше - Volkswagen Passat і Golf.',
      ru: 'В марте парламент временно освободил ввоз авто от таможенных платежей на время военного положения. До конца мая по этой норме ввезли около 130 тысяч авто: в среднем 14-летних, в основном 2003-2007 годов, со средней таможенной стоимостью около 4,6 тысячи долларов. Чаще всего - Volkswagen Passat и Golf.',
      en: 'In March parliament temporarily exempted car imports from customs payments for the duration of martial law. By the end of May about 130,000 cars came in under it: 14 years old on average, mostly 2003-2007, with an average customs value near $4,600. The most common were the Volkswagen Passat and Golf.'
    }
  },
  {
    when: { ua: '2024', ru: '2024', en: '2024' },
    text: {
      ua: 'У лютому податковий комітет Ради рекомендував за основу законопроєкт № 10380 про «розмитнення в Дії»: дистанційну тимчасову послугу до вступу України в ЄС, де вартість авто визначає єдина база митної вартості. Ставки зборів за проєктом не змінювались, а звичайне розмитнення з декларацією лишалося б доступним.',
      ru: 'В феврале налоговый комитет Рады рекомендовал за основу законопроект № 10380 о «растаможке в Дії»: дистанционной временной услуге до вступления Украины в ЕС, где стоимость авто определяет единая база таможенной стоимости. Ставки сборов по проекту не менялись, а обычная растаможка с декларацией оставалась бы доступной.',
      en: 'In February the Rada’s tax committee recommended bill No. 10380 on “customs clearance in Diia” in principle: a temporary remote service, until Ukraine joins the EU, where a single customs-value database sets the car’s value. Under the bill the rates would not change, and the usual clearance with a declaration would stay available.'
    }
  }
]

export const HISTORY_NOTE: L10n = {
  ua: 'Це події на момент публікацій джерел (2021-2024). Правила ввезення й розмитнення змінюються, тож перед купівлею звіряйтесь із митницею й чинним законодавством: ми їх тут не наводимо.',
  ru: 'Это события на момент публикации источников (2021-2024). Правила ввоза и растаможки меняются, поэтому перед покупкой сверяйтесь с таможней и действующим законодательством: мы их здесь не приводим.',
  en: 'These are events as of the sources’ publication (2021-2024). The rules for importing and clearing change, so check customs and current law before buying: we do not give them here.'
}

export type Reason = { id: string; title: L10n; text: L10n }

export const WHY_INTRO: L10n = {
  ua: 'Більшість людей, які ввозять авто, шукають не екзотику, а найдоступніший спосіб отримати надійний транспорт.',
  ru: 'Большинство людей, ввозящих авто, ищут не экзотику, а самый доступный способ получить надёжный транспорт.',
  en: 'Most people who import a car are not after something exotic: they want the most affordable way to a reliable vehicle.'
}

export const WHY: Reason[] = [
  {
    id: 'price',
    title: { ua: 'Ціна', ru: 'Цена', en: 'Price' },
    text: {
      ua: 'Понад 60% покупок - до 10 тисяч доларів, а нове авто для більшості недосяжне. Для ввезених легковиків найчастіша ціна - 1-2 тисячі доларів.',
      ru: 'Более 60% покупок - до 10 тысяч долларов, а новое авто для большинства недостижимо. Для ввезённых легковых самая частая цена - 1-2 тысячи долларов.',
      en: 'Over 60% of purchases are under $10,000, and a new car is out of reach for most. For imported passenger cars the most common price is $1,000-2,000.'
    }
  },
  {
    id: 'cash',
    title: { ua: 'Немає розстрочок', ru: 'Нет рассрочек', en: 'No car loans' },
    text: {
      ua: 'Програм автокредитування майже нема, тож купують за готівку, переважно в іноземній валюті. Дешевше й швидше купити вживане за кордоном, ніж чекати на нове.',
      ru: 'Программ автокредитования почти нет, поэтому покупают за наличные, преимущественно в иностранной валюте. Дешевле и быстрее купить подержанное за границей, чем ждать новое.',
      en: 'Car-loan programmes are scarce, so people pay cash, mostly in foreign currency. Buying used abroad is cheaper and quicker than waiting for a new car.'
    }
  },
  {
    id: 'upgrade',
    title: { ua: 'Оновлення парку', ru: 'Обновление парка', en: 'A newer fleet' },
    text: {
      ua: 'В Україні 232 авто на 1000 жителів проти приблизно 610 у Європі. Ввезені авто замінюють старі радянські й російські моделі новішими європейськими, а аналітики пов’язують це з безпекою.',
      ru: 'В Украине 232 авто на 1000 жителей против примерно 610 в Европе. Ввезённые авто заменяют старые советские и российские модели новыми европейскими, а аналитики связывают это с безопасностью.',
      en: 'Ukraine has 232 cars per 1,000 people against about 610 in Europe. Imported cars replace old Soviet and Russian models with newer European ones, which analysts link to safety.'
    }
  },
  {
    id: 'war',
    title: { ua: 'Війна й мобільність', ru: 'Война и мобильность', en: 'War and mobility' },
    text: {
      ua: 'Війна прибрала з активного парку близько мільйона авто: приблизно 500 тисяч втрачено, ще 300 тисяч виїхало. Авто потрібні для роботи, сім’ї, евакуації та волонтерської й військової логістики.',
      ru: 'Война убрала из активного парка около миллиона авто: примерно 500 тысяч потеряно, ещё 300 тысяч выехало. Авто нужны для работы, семьи, эвакуации и волонтёрской и военной логистики.',
      en: 'The war removed about a million cars from the active fleet: roughly 500,000 lost and 300,000 gone abroad. Cars are needed for work, family, evacuation and volunteer and military logistics.'
    }
  },
  {
    id: 'shortage',
    title: { ua: 'Дефіцит у Європі', ru: 'Дефицит в Европе', en: 'A squeeze in Europe' },
    text: {
      ua: 'У 2021 році європейці теж масово купували вживане, бо нове доводилось чекати місяцями: у Нідерландах рекорд ввезення, а Польща ввезла 796 тисяч вживаних легковиків за січень-жовтень, майже вдвічі більше за Україну. Авто, що раніше їхали до нас, лишались у ЄС, ціни росли, а «нормою» став пробіг 200+ тисяч км.',
      ru: 'В 2021 году европейцы тоже массово покупали подержанное, потому что новое приходилось ждать месяцами: в Нидерландах рекорд ввоза, а Польша ввезла 796 тысяч подержанных легковых за январь-октябрь, почти вдвое больше Украины. Авто, ехавшие раньше к нам, оставались в ЕС, цены росли, а «нормой» стал пробег 200+ тысяч км.',
      en: 'In 2021 Europeans also bought used in bulk because new cars meant months of waiting: the Netherlands had a record year of imports, and Poland imported 796,000 used passenger cars in January-October, nearly twice Ukraine. Cars that used to come to us stayed in the EU, prices rose and 200,000+ km became normal.'
    }
  },
  {
    id: 'value',
    title: { ua: 'Митна вартість', ru: 'Таможенная стоимость', en: 'Customs value' },
    text: {
      ua: 'За оцінкою аналітиків авторинку, оцінка того самого авто могла різнитися до 40% залежно від методу, що давало простір для хабарів. Саме це й мала прибрати єдина база вартості в проєкті «розмитнення в Дії».',
      ru: 'По оценке аналитиков авторынка, оценка одного и того же авто могла различаться до 40% в зависимости от метода, что давало простор для взяток. Именно это и должна была убрать единая база стоимости в проекте «растаможки в Дії».',
      en: 'According to car-market analysts, the same car could be valued up to 40% differently depending on the method, which left room for bribes. A single value database was meant to remove that in the “Diia clearance” bill.'
    }
  }
]

export const WHY_NOTE: L10n = {
  ua: 'Побічний ефект дефіциту - більше шахрайства: скручений пробіг, приховані дефекти чи минуле авто (таксі, ДТП). Тому історію авто варто перевіряти.',
  ru: 'Побочный эффект дефицита - больше мошенничества: скрученный пробег, скрытые дефекты или прошлое авто (такси, ДТП). Поэтому историю авто стоит проверять.',
  en: 'A side effect of the squeeze is more fraud: wound-back mileage, hidden faults or a hidden past (taxi, crash). That is why a car’s history is worth checking.'
}

export type MarketFact = { id: string; label: L10n; value: L10n }

export const MARKET_INTRO: L10n = {
  ua: 'За митною статистикою 2023 року (Інститут дослідження авторинку, оприлюднено 8 березня 2024) вживані авто, ввезені з-за кордону, склали 18,5% ринку за фактичними продажами; 74,5% угод - перепродаж усередині країни, і лише 7% - нові. У вибірку входять легковики, вантажівки, сідельні тягачі, причепи й автобуси.',
  ru: 'По таможенной статистике 2023 года (Институт исследования авторынка, опубликовано 8 марта 2024) подержанные авто, ввезённые из-за границы, составили 18,5% рынка по фактическим продажам; 74,5% сделок - перепродажа внутри страны, и лишь 7% - новые. В выборку входят легковые, грузовики, седельные тягачи, прицепы и автобусы.',
  en: 'By the customs statistics of 2023 (Institute of Auto Market Research, published 8 March 2024), used vehicles brought in from abroad made up 18.5% of the market by actual sales; 74.5% of transactions were resales inside the country and only 7% were new. The sample covers cars, trucks, tractor units, trailers and buses.'
}

const pct = (n: string): L10n => ({ ua: `${n.replace('.', ',')}%`, ru: `${n.replace('.', ',')}%`, en: `${n}%` })

export const MARKET_FACTS: MarketFact[] = [
  { id: 'eu', label: { ua: 'з країн ЄС', ru: 'из стран ЕС', en: 'from the EU' }, value: pct('64.6') },
  { id: 'us', label: { ua: 'зі США', ru: 'из США', en: 'from the USA' }, value: pct('24.9') },
  {
    id: 'cars',
    label: { ua: 'легковики серед ввезеного', ru: 'легковые среди ввезённого', en: 'passenger cars among imports' },
    value: pct('83.6')
  },
  {
    id: 'legal',
    label: { ua: 'декларантів - юрособи', ru: 'декларантов - юрлица', en: 'declarants were companies' },
    value: pct('55.9')
  }
]

export const MARKET_ORIGINS: L10n = {
  ua: 'Серед європейського напряму найбільше - Польща (27,1%, інколи лише як пункт перевантаження), Німеччина (23,6%), Словаччина (8,3%), Нідерланди (5,3%) і Литва (4,7%). Для легковиків пік - 1-2 тисячі доларів; діапазон 10-15 тисяч доларів - переважно авто зі США, зокрема електромобілі.',
  ru: 'В европейском направлении больше всего - Польша (27,1%, иногда лишь как пункт перегрузки), Германия (23,6%), Словакия (8,3%), Нидерланды (5,3%) и Литва (4,7%). Для легковых пик - 1-2 тысячи долларов; диапазон 10-15 тысяч долларов - в основном авто из США, в том числе электромобили.',
  en: 'Within the European share the biggest are Poland (27.1%, sometimes only a reloading point), Germany (23.6%), Slovakia (8.3%), the Netherlands (5.3%) and Lithuania (4.7%). For passenger cars the peak is $1,000-2,000; the $10,000-15,000 range is mostly US cars, electric cars included.'
}

export const MARKET_OFFICES: L10n = {
  ua: 'Три митниці - Волинська (28,6%), Львівська (26,6%) і Рівненська (12,7%) - оформили 67,9% усього ввезення: це близькість кордонів і пунктів пропуску. Найслабші результати були в східних і центральних митницях.',
  ru: 'Три таможни - Волынская (28,6%), Львовская (26,6%) и Ровенская (12,7%) - оформили 67,9% всего ввоза: это близость границ и пунктов пропуска. Самые слабые результаты были у восточных и центральных таможен.',
  en: 'Three customs offices - Volyn (28.6%), Lviv (26.6%) and Rivne (12.7%) - handled 67.9% of all imports, thanks to the nearby borders and crossings. The weakest results were at eastern and central offices.'
}

export const MARKET_NOTE: L10n = {
  ua: 'Це митні дані про ввезення; наш підрахунок вище ґрунтується на реєстраціях, тож цифри не мають збігатися.',
  ru: 'Это таможенные данные о ввозе; наш подсчёт выше основан на регистрациях, поэтому цифры не обязаны совпадать.',
  en: 'These are customs import figures; our count above is based on registrations, so the numbers need not match.'
}

export type Source = { href: string; title: L10n; note: L10n }

export const SOURCES: Source[] = [
  {
    href: 'https://eauto.org.ua/news/493-import-vzhivanogo-avtotransportu-shcho-zvidki-cherez-yaki-mitnici-ta-za-skilki-vvozili-torik',
    title: {
      ua: 'Імпорт вживаного автотранспорту: що, звідки, через які митниці',
      ru: 'Импорт подержанного автотранспорта: что, откуда, через какие таможни',
      en: 'Used-vehicle imports: what, from where, through which customs offices'
    },
    note: {
      ua: 'eauto.org.ua, 8.03.2024, дані 2023 року',
      ru: 'eauto.org.ua, 8.03.2024, данные 2023 года',
      en: 'eauto.org.ua, 8 Mar 2024, 2023 data'
    }
  },
  {
    href: 'https://eauto.org.ua/news/466-rozmitnennya-v-diji-podatkoviy-komitet-vr-rekomenduvav-uhvaliti-vidpovidniy-proyekt-za-osnovu',
    title: {
      ua: 'Розмитнення в Дії: податковий комітет рекомендував проєкт за основу',
      ru: 'Растаможка в Дії: налоговый комитет рекомендовал проект за основу',
      en: 'Customs clearance in Diia: the tax committee recommends the bill in principle'
    },
    note: { ua: 'eauto.org.ua, 1.02.2024', ru: 'eauto.org.ua, 1.02.2024', en: 'eauto.org.ua, 1 Feb 2024' }
  },
  {
    href: 'https://eauto.org.ua/news/130-ukrajinskiy-avtorinok-istoriya-problem-ta-yak-jih-rozv-yazati',
    title: {
      ua: 'Український авторинок: історія, проблеми та як їх розв’язати',
      ru: 'Украинский авторынок: история, проблемы и как их решить',
      en: 'The Ukrainian car market: history, problems and how to solve them'
    },
    note: {
      ua: 'eauto.org.ua; цифри 1997-2022',
      ru: 'eauto.org.ua; цифры 1997-2022',
      en: 'eauto.org.ua; figures for 1997-2022'
    }
  },
  {
    href: 'https://tsn.ua/auto/news/avto_mir/na-odnomu-z-yevropeyskih-rinkiv-stavsya-buv-importu-vzhivanih-avto-yak-ce-vpline-na-ukrayinciv-1920658.html',
    title: {
      ua: 'На одному з європейських ринків стався бум імпорту вживаних авто',
      ru: 'На одном из европейских рынков случился бум импорта подержанных авто',
      en: 'A boom in used-car imports on one European market'
    },
    note: { ua: 'ТСН, 29.11.2021', ru: 'ТСН, 29.11.2021', en: 'TSN, 29 Nov 2021' }
  },
  {
    href: 'https://www.aecsolutions.com/blog/a-brief-history-of-automotive-imports/',
    title: {
      ua: 'A brief history of automotive imports',
      ru: 'A brief history of automotive imports',
      en: 'A brief history of automotive imports'
    },
    note: { ua: 'AEC Solutions (англійською)', ru: 'AEC Solutions (на английском)', en: 'AEC Solutions' }
  }
]

export const SOURCES_NOTE: L10n = {
  ua: 'Усі цифри цих розділів - з наведених публікацій, на дату кожної з них; ми їх не перевіряли самі.',
  ru: 'Все цифры этих разделов - из приведённых публикаций, на дату каждой из них; мы их не проверяли сами.',
  en: 'Every figure in these sections comes from these articles as of their date; we have not verified them ourselves.'
}

export const APP_INTRO: L10n = {
  ua: 'Якщо авто ввезене, найкраща перевірка - його власний номер. Введіть номерний знак або VIN на головній (той самий рядок, фото чи камера) і дивіться історію реєстрацій, чи було авто ввезене, розшук, відкликання та посилання на архіви торгів.',
  ru: 'Если авто ввезено, лучшая проверка - его собственный номер. Введите номерной знак или VIN на главной (та же строка, фото или камера) и смотрите историю регистраций, было ли авто ввезено, розыск, отзывы и ссылки на архивы торгов.',
  en: 'If a car was imported, the best check is its own number. Enter a plate or VIN on the home page (the same box, a photo or the camera) and see the registration history, whether the car was imported, the wanted check, recalls and links to bidding archives.'
}
