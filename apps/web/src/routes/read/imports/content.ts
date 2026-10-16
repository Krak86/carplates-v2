import type { L10n } from '@/routes/read/types'

export const WHAT_COUNTS: L10n = {
  ua: 'Рахуємо авто, що зараз на обліку, за операціями в їхній історії реєстрацій. «Ввезене» — є операція реєстрації авто, привезеного з-за кордону (не нове авто від дилера). «Через дилера» — авто, придбане в торговельній організації, без ввезення. Це підрахунок за реєстраційними операціями, а не висновок про якесь окреме авто. Відкриті дані реєстру починаються з 2013 року, тож ранні роки неповні.',
  ru: 'Считаем авто, которые сейчас на учёте, по операциям в их истории регистраций. «Ввезённое» — есть операция регистрации авто, привезённого из-за границы (не новое авто от дилера). «Через дилера» — авто, приобретённое в торговой организации, без ввоза. Это подсчёт по регистрационным операциям, а не вывод о каком-либо отдельном авто. Открытые данные реестра начинаются с 2013 года, поэтому ранние годы неполные.',
  en: 'We count cars that are registered now, by the operations in their registration history. “Imported” means the history has a registration of a car brought in from abroad (not a new car sold by a dealer). “Via a dealer” means the car was bought from a trade organization, with no import. These are counts by registration operation, not a verdict on any single car. The registry’s open data starts in 2013, so the earliest years are incomplete.'
}

export const YEARS_NOTE: L10n = {
  ua: 'Рік — це рік першої такої операції, а не рік випуску авто. Авто, що змінило власників, лишається в тій самій групі: ми дивимось на всю історію, а не лише на останню операцію.',
  ru: 'Год — это год первой такой операции, а не год выпуска авто. Авто, сменившее владельцев, остаётся в той же группе: мы смотрим на всю историю, а не только на последнюю операцию.',
  en: 'The year is that of the first such operation, not the car’s model year. A car that has changed hands stays in the same group: we look at the whole history, not just the last operation.'
}

export const COUNTRY_NOTE: L10n = {
  ua: 'Країна — це місце, де авто збудоване за першими символами VIN (1, 4, 5 — США, 2 — Канада). Це не доводить, що авто купили на аукціоні чи в Америці: його могли виробити там і потім продати де завгодно. Для частини авто VIN порожній або його префікс нам невідомий — це окремий рядок. Деякі авто для ринку США збудовані в Мексиці чи Німеччині, тож цифри — орієнтир, а не точний підрахунок.',
  ru: 'Страна — это место, где авто собрано, по первым символам VIN (1, 4, 5 — США, 2 — Канада). Это не доказывает, что авто купили на аукционе или в Америке: его могли произвести там и потом продать где угодно. Для части авто VIN пустой или его префикс нам неизвестен — это отдельная строка. Некоторые авто для рынка США собраны в Мексике или Германии, поэтому цифры — ориентир, а не точный подсчёт.',
  en: 'The country is where the car was built, read off the first VIN characters (1, 4 and 5 mean the USA, 2 means Canada). It does not prove the car was bought at an auction or in America: it may have been built there and sold anywhere afterwards. For some cars the VIN is empty or its prefix is not one we know; that is its own row. Some cars for the US market are built in Mexico or Germany, so treat the figures as a guide, not an exact count.'
}

export type Check = { key: 'auction' | 'recalls' | 'wanted'; text: L10n }

export const CHECKS: readonly Check[] = [
  {
    key: 'auction',
    text: {
      ua: 'На картці авто (за VIN) є посилання на архіви торгів, де часто видно фото й пробіг на момент продажу. Ми лише ведемо до цих сайтів — висновки робіть самі.',
      ru: 'На карточке авто (по VIN) есть ссылки на архивы торгов, где часто видны фото и пробег на момент продажи. Мы лишь ведём на эти сайты — выводы делайте сами.',
      en: 'The car’s card (by VIN) links to bidding archives, which often show photos and the mileage at sale. We only link to those sites; draw your own conclusions.'
    }
  },
  {
    key: 'recalls',
    text: {
      ua: 'Авто з північноамериканського ринку може мати відкликання, яких немає в Європі, і навпаки. Картка авто показує кампанії за VIN.',
      ru: 'Авто с североамериканского рынка может иметь отзывы, которых нет в Европе, и наоборот. Карточка авто показывает кампании по VIN.',
      en: 'A car from the North American market may have recalls that Europe does not, and the other way round. The car’s card shows campaigns by VIN.'
    }
  },
  {
    key: 'wanted',
    text: {
      ua: 'Перевірте, чи немає авто у переліку розшукуваних — картка авто показує це за номером і VIN.',
      ru: 'Проверьте, нет ли авто в перечне разыскиваемых — карточка авто показывает это по номеру и VIN.',
      en: 'Check that the car is not on the wanted list; the car’s card shows this by plate and VIN.'
    }
  }
]
