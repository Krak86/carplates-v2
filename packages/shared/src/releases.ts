export const RELEASE_GROUPS = ['new', 'improved', 'data', 'fix'] as const
export type ReleaseGroup = (typeof RELEASE_GROUPS)[number]

export const RELEASE_LANGS = ['ua', 'ru', 'en'] as const
export type ReleaseLang = (typeof RELEASE_LANGS)[number]

export type ReleaseItem = { group: ReleaseGroup } & Record<ReleaseLang, string>

/** `version`: `v2.<stage commit count>` at the end of that day (same scheme as the app footer). */
export type ReleaseDay = { date: string; version?: string; items: readonly ReleaseItem[] }

const item = (group: ReleaseGroup, ua: string, ru: string, en: string): ReleaseItem => ({ group, ua, ru, en })

/**
 * Brief change log, one entry per working day. Add the newest day at the top, keep items to one line each.
 * Written from the git history; the page sorts by date, so order here is not significant.
 */
export const RELEASES: readonly ReleaseDay[] = [
  {
    date: '2026-11-13',
    version: 'v2.1215',
    items: [
      item(
        'improved',
        'Політика конфіденційності переписана: хто відповідає за дані, правові підстави, таблиці cookie та строків зберігання, список обробників (Contabo, Cloudflare, Resend, PostHog ЄС, Sentry, Google, Telegram, Disqus) і ваші права; діалог видалення облікового запису тепер перелічує й синхронізовані дані та фото.',
        'Политика конфиденциальности переписана: кто отвечает за данные, правовые основания, таблицы cookie и сроков хранения, список обработчиков (Contabo, Cloudflare, Resend, PostHog ЕС, Sentry, Google, Telegram, Disqus) и ваши права; диалог удаления аккаунта теперь перечисляет и синхронизированные данные, и фото.',
        'The privacy policy was rewritten: who is responsible for the data, legal bases, cookie and retention tables, the list of processors (Contabo, Cloudflare, Resend, PostHog EU, Sentry, Google, Telegram, Disqus) and your rights; the delete-account dialog now also lists synced data and shared photos.'
      )
    ]
  },
  {
    date: '2026-11-12',
    version: 'v2.1182',
    items: [
      item(
        'fix',
        'Колірний фільтр і мініатюри фото моделі більше не зникають у браузері, де авто відкривали до першого сканування фото: ці дані не зберігаються в офлайн-кеші.',
        'Цветовой фильтр и миниатюры фото модели больше не пропадают в браузере, где авто открывали до первого сканирования фото: эти данные не сохраняются в офлайн-кэше.',
        'The colour filter and model photo thumbnails no longer go missing in a browser that opened the car before its photo was scanned: that data is no longer kept in the offline cache.'
      ),
      item(
        'improved',
        'Інші фото моделі тепер маленькі мініатюри під головним фото (як в аукціонів): клік підміняє головне фото, великої сітки з «Показати більше» немає.',
        'Другие фото модели теперь маленькие миниатюры под главным фото (как у аукционов): клик подменяет главное фото, большой сетки с «Показать больше» нет.',
        'More photos of the model are now small thumbnails under the hero photo (like the auctions): a click swaps the hero, and the big grid with “Show more” is gone.'
      )
    ]
  },
  {
    date: '2026-11-09',
    version: 'v2.1180',
    items: [
      item(
        'improved',
        'Підсумок перевірок: якщо IIHS оцінив актуальний краш-тест як «Поганий», картка краш-тестів позначається «Увага».',
        'Итоги проверок: если IIHS оценил актуальный краш-тест как «Плохой», карточка краш-тестов отмечается «Внимание».',
        'Checks summary: when IIHS rates an applicable crash test Poor, the crash-test card is flagged Attention.'
      ),
      item(
        'fix',
        'Рейтинги краш-тестів моделей: дубльовані назви («GX 470 GX 470», «Q7 Q7») зведено в одну модель; IIHS без тесту на удар (лише сидіння чи дах) більше не дає оцінку, тож Lexus GX 470 не має хибного «0».',
        'Рейтинги краш-тестов моделей: задвоенные названия («GX 470 GX 470», «Q7 Q7») сведены в одну модель; IIHS без теста на удар (только сиденья или крыша) больше не даёт оценку, поэтому у Lexus GX 470 нет ложного «0».',
        'Model crash-test rankings: doubled names (“GX 470 GX 470”, “Q7 Q7”) are merged into one model; an IIHS entry without an impact test (only seats or roof) no longer yields a score, so the Lexus GX 470 no longer shows a false “0”.'
      ),
      item(
        'new',
        'Підсумок перевірок угорі картки авто: розшук, реєстр, краш-тести, CO2, аукціони й відкликання. Кожна картка каже «Увага», «Проблем не знайдено» або «Немає даних», і що саме та коли перевірено.',
        'Итоги проверок вверху карточки авто: розыск, реестр, краш-тесты, CO2, аукционы и отзывы. Каждая карточка говорит «Внимание», «Проблем не найдено» или «Нет данных», и что именно и когда проверено.',
        'A summary strip at the top of the car card: wanted check, registry, crash tests, CO2, auctions and recalls. Each card says “Attention”, “No problems found” or “No data”, and what was searched and when.'
      ),
      item(
        'new',
        'Сторінка «Порівняння з іншими сервісами»: що є в нас, а що в baza-gai, Opendatabot, AUTO.RIA, RST, carVertical і CARFAX, у чому наша перевага, чого бракує і що далі.',
        'Страница «Сравнение с другими сервисами»: что есть у нас, а что в baza-gai, Opendatabot, AUTO.RIA, RST, carVertical и CARFAX, в чём наше преимущество, чего не хватает и что дальше.',
        'A “Compared to other services” page: what we have versus baza-gai, Opendatabot, AUTO.RIA, RST, carVertical and CARFAX, where we lead, what is missing and what comes next.'
      ),
      item(
        'improved',
        'Фото моделі: якщо є фото цієї моделі потрібного кольору, воно стає головним (з підписом, що це інше авто), а під ним з’являється стрічка інших фото з Wikimedia Commons з автором і ліцензією.',
        'Фото модели: если есть фото этой модели нужного цвета, оно становится главным (с подписью, что это другое авто), а под ним появляется лента других фото с Wikimedia Commons с автором и лицензией.',
        'Model photos: when a photo of the model in the right colour exists it becomes the main photo (captioned as another car), and a strip of more Wikimedia Commons photos with author and licence appears below it.'
      ),
      item(
        'fix',
        'Свайп фото працює лише на сенсорних екранах: на комп’ютері мишею фото більше не «тягнеться».',
        'Свайп фото работает только на сенсорных экранах: на компьютере мышью фото больше не «тянется».',
        'Photo swipe is touch-only: dragging a photo with a mouse on desktop no longer moves it.'
      )
    ]
  },
  {
    date: '2026-11-08',
    version: 'v2.1160',
    items: [
      item(
        'new',
        'Фото авто в шапці можна гортати свайпом вліво-вправо: фото їде за пальцем, а наступне плавно з’являється збоку.',
        'Фото авто в шапке можно листать свайпом влево-вправо: фото едет за пальцем, а следующее плавно появляется сбоку.',
        'The car photos in the hero can now be swiped left and right: the photo follows your finger and the next one glides in from the side.'
      ),
      item(
        'fix',
        'Фото авто більше не «стрибає» по висоті, коли перемикаєш фото у смузі мініатюр: слот завжди однієї висоти.',
        'Фото авто больше не «прыгает» по высоте при переключении фото в полосе миниатюр: слот всегда одной высоты.',
        'The car photo no longer jumps in height when you switch images in the thumbnail strip: the slot keeps one fixed height.'
      ),
      item(
        'improved',
        'Перевірка Cloudflare на формі входу та в контактах більше не показує блок «Успішно»: віджет з’являється лише коли потрібен клік.',
        'Проверка Cloudflare в форме входа и в контактах больше не показывает блок «Успешно»: виджет появляется только когда нужен клик.',
        'The Cloudflare check on the sign-in and contact forms no longer shows a lingering "Success!" box: the widget appears only when a click is needed.'
      ),
      item(
        'improved',
        'Вимова марки: англійський запис для всіх марок, а коли немає запису від носія, кнопка вимовляє назву голосом браузера; на Android у встановленому застосунку кнопка «Слухати» тепер працює.',
        'Произношение марки: английская запись для всех марок, а когда нет записи носителя, кнопка произносит название голосом браузера; на Android в установленном приложении кнопка «Слушать» теперь работает.',
        'Brand pronunciation: an English respelling for every make, and when there is no native-speaker clip the button reads the name with the browser voice; the "Listen" button now works in the installed Android app.'
      ),
      item(
        'improved',
        '«Копіювати все» і експорт тепер містять лоти українських аукціонів (SETAM, Prozorro.Sale): статус, місяць, стартову й продажну ціну та місце.',
        '«Копировать всё» и экспорт теперь содержат лоты украинских аукционов (SETAM, Prozorro.Sale): статус, месяц, стартовую и продажную цену и место.',
        '"Copy all info" and exports now include Ukrainian auction lots (SETAM, Prozorro.Sale): status, month, start and sale price, and location.'
      ),
      item(
        'improved',
        'Форма зворотного зв’язку швидше показує перевірку «Я не робот»: скрипт завантажується, щойно форма відкрилась.',
        'Форма обратной связи быстрее показывает проверку «Я не робот»: скрипт загружается, как только форма открылась.',
        'The contact form shows the "I am not a robot" check sooner: the script loads as soon as the form opens.'
      ),
      item(
        'improved',
        'Вхід через Telegram працює в ізольованому вікні всередині сторінки, тож віджет Telegram не має доступу до решти застосунку.',
        'Вход через Telegram работает в изолированном окне внутри страницы, так что виджет Telegram не имеет доступа к остальному приложению.',
        'Telegram sign-in runs in an isolated frame inside the page, so the Telegram widget cannot reach the rest of the app.'
      ),
      item(
        'data',
        'На /data-status видно, для яких марок ще немає запису вимови.',
        'На /data-status видно, для каких марок ещё нет записи произношения.',
        '/data-status shows which makes still have no pronunciation entry.'
      ),
      item(
        'fix',
        'Старі копії вимови марки на пристроях більше не застрягають: нові записи підвантажуються протягом доби.',
        'Старые копии произношения марки на устройствах больше не залипают: новые записи подгружаются в течение суток.',
        'Stale brand-pronunciation copies on devices no longer stick: new entries arrive within a day.'
      )
    ]
  },
  {
    date: '2026-11-07',
    version: 'v2.1133',
    items: [
      item(
        'new',
        'Кнопка «Запчастини» для BMW на картці номера й VIN та на сторінках марки й моделі: посилання на каталог запчастин realoem.com (з VIN - на сторінку саме цього авто).',
        'Кнопка «Запчасти» для BMW на карточке номера и VIN и на страницах марки и модели: ссылка на каталог запчастей realoem.com (с VIN - на страницу именно этого авто).',
        'A "Parts" button for BMW on the plate and VIN card and on make and model pages: a link to the realoem.com parts catalog (from a VIN, to that exact car\'s page).'
      ),
      item(
        'new',
        'Посилання на /alarms (мапа й втрати) тепер мають власні картки для попереднього перегляду; у втратах - тривалість війни в роках, місяцях і днях, а на мапі - кнопка «Поділитися».',
        'Ссылки на /alarms (карта и потери) теперь имеют собственные карточки предпросмотра; в потерях - длительность войны в годах, месяцах и днях, а на карте - кнопка «Поделиться».',
        'Links to /alarms (map and losses) now get their own preview cards; losses show the war duration in years, months and days, and the map has a share button.'
      ),
      item(
        'new',
        'Гра-гонки: повноекранний режим і вібрація при аварії на телефоні.',
        'Игра-гонки: полноэкранный режим и вибрация при аварии на телефоне.',
        'Racing game: an immersive full-screen mode and crash vibration on phones.'
      ),
      item(
        'improved',
        'Кольоровий фільтр на фото моделі: у каруселі лота модель іде останнім слайдом з перефарбуванням, а під фото з’явились мініатюри «перефарбоване / оригінал»; зі свайпом на оригінал.',
        'Цветовой фильтр на фото модели: в карусели лота модель идёт последним слайдом с перекраской, а под фото появились миниатюры «перекрашенное / оригинал»; со свайпом на оригинал.',
        'Colour filter on the model photo: in the lot carousel the model is the last slide, repainted, with "repainted / original" thumbnails under the photo and a swipe to the original.'
      ),
      item(
        'improved',
        'Мапа тривог: області під тривогою пульсують, а фонова мапа заповнює весь екран; на мапі підписи не стають замалими.',
        'Карта тревог: области под тревогой пульсируют, а фоновая карта заполняет весь экран; на карте подписи не становятся слишком мелкими.',
        'Alert map: regions under alert pulse, the background map fills the whole screen, and map labels keep a minimum readable size.'
      ),
      item(
        'improved',
        'Над шапкою з’являється смужка прогресу, щойно ви натиснули на посилання; у «Мої поширені фото» - лічильник активних посилань.',
        'В шапке появляется полоска прогресса сразу после нажатия на ссылку; в «Мои расшаренные фото» - счётчик активных ссылок.',
        'A progress line in the header starts as soon as you click a link; "My shared photos" shows a counter of active links.'
      ),
      item(
        'improved',
        'У версії застосунку внизу сторінки й на «Що нового» видно номер збірки; ігрові плитки на телефоні нижчі.',
        'Версия приложения внизу страницы и на «Что нового» показывает номер сборки; игровые плитки на телефоне ниже.',
        'The footer and "What\'s new" show the app build number; game tiles are shorter on phones.'
      ),
      item(
        'fix',
        'Фото лотів тепер ідуть перед фото моделі під доданим фото, а на картці «не знайдено» немає зайвого другого фото.',
        'Фото лотов теперь идут перед фото модели под добавленным фото, а на карточке «не найдено» нет лишнего второго фото.',
        'Lot photos now come before the model photo under an attached photo, and the "not found" card no longer shows a second photo.'
      ),
      item(
        'fix',
        'Невідомий файл маски кольору відповідає «не знайдено» замість кешованої помилки.',
        'Неизвестный файл маски цвета отвечает «не найдено» вместо кэшированной ошибки.',
        'An unknown colour-mask file now answers "not found" instead of a cached error.'
      ),
      item(
        'new',
        'Кнопка з динаміком біля назви марки (сторінка марки, картка номера й VIN): як вимовляти марку українською, російською й англійською (з наголосом), а для частини марок ще й запис вимови від носія з Wikimedia Commons.',
        'Кнопка с динамиком рядом с названием марки (страница марки, карточка номера и VIN): как произносить марку по-украински, по-русски и по-английски (с ударением), а для части марок ещё и запись произношения носителя с Wikimedia Commons.',
        'A speaker button beside the make name (make page, plate and VIN card): how to say the brand in Ukrainian, Russian and English (with stress), and for some makes a native-speaker recording from Wikimedia Commons.'
      )
    ]
  },
  {
    date: '2026-11-06',
    version: 'v2.1097',
    items: [
      item(
        'new',
        'На /alarms нова вкладка «Відновлення»: проєкти відбудови з державної системи DREAM по областях (кількість і зобов’язане фінансування) поверх тієї самої карти тривог. Дані оновлюються щодня, лише для інформації.',
        'На /alarms новая вкладка «Восстановление»: проекты восстановления из государственной системы DREAM по областям (количество и обязанное финансирование) поверх той же карты тревог. Данные обновляются ежедневно, только для информации.',
        'New "Recovery" tab on /alarms: reconstruction projects from the government system DREAM per region (count and committed funding) on top of the same alert map. Updated daily, informational only.'
      ),
      item(
        'new',
        'Кольоровий фільтр на фото моделі: якщо колір авто в реєстрі інший, ніж на фото, кузов перефарбовується в колір з реєстру (кнопка вгорі праворуч вмикає й вимикає; у підписі «змінено: колір»)',
        'Цветовой фильтр на фото модели: если цвет авто в реестре отличается от цвета на фото, кузов перекрашивается в цвет из реестра (кнопка вверху справа включает и выключает; в подписи «изменено: цвет»)',
        'A colour filter on the model photo: when the registered colour differs from the car in the photo, the body is repainted to the registered colour (a button at the top right turns it on and off; the credit says "modified: colour")'
      ),
      item(
        'new',
        'На /data-status: скільки записів ми зберігаємо по кожному джерелу, хронологія останніх оновлень (клік веде до картки джерела) та швидкі посилання на групи за частотою; «Наживо» і «Щохвилини» тепер першими',
        'На /data-status: сколько записей мы храним по каждому источнику, хронология последних обновлений (клик ведёт к карточке источника) и быстрые ссылки на группы по частоте; «Вживую» и «Каждую минуту» теперь первыми',
        'On /data-status: how many records we hold per source, a timeline of the latest updates (a click jumps to the source\'s tile) and quick links to the frequency groups; "Live" and "Every minute" now come first'
      ),
      item(
        'new',
        'Пошук в історії пошуку: введіть номер, VIN, марку чи модель, і список відфільтрується (номер можна вводити кирилицею чи латиницею)',
        'Поиск по истории поиска: введите номер, VIN, марку или модель, и список отфильтруется (номер можно вводить кириллицей или латиницей)',
        'Search inside your search history: type a plate, VIN, make or model to filter the list (a plate works in Cyrillic or Latin letters)'
      ),
      item(
        'improved',
        'Мапа тривог на весь екран показує всю країну й не залишає чорних смуг; у характеристиках покоління двигуни, що не збігаються з вашим авто, згорнуто в групу «Інші двигуни»; підказка біля «+» розширеного пошуку прибрана',
        'Карта тревог на весь экран показывает всю страну и не оставляет чёрных полос; в характеристиках поколения двигатели, не совпадающие с вашим авто, свёрнуты в группу «Другие двигатели»; подсказка у «+» расширенного поиска убрана',
        'The full-screen alert map shows the whole country without black bars; in the generation specs the engines that do not match your car are folded into an "Other engines" group; the hint by the advanced-search "+" is gone'
      ),
      item(
        'new',
        'Список порівняння: кнопка «Додати до порівняння» на картці номера, VIN, моделі, в обраному та історії (список зберігається в браузері), на /compare його видно кольоровими мітками з вибором слота A або B. Посилання на порівняння тепер коротке (номери латиницею) і має власний попередній перегляд з обома авто; у слоті є стрілка до картки авто та підказка «?» про джерела даних',
        'Список сравнения: кнопка «Добавить к сравнению» на карточке номера, VIN, модели, в избранном и истории (список хранится в браузере), на /compare он виден цветными метками с выбором слота A или B. Ссылка на сравнение теперь короткая (номера латиницей) и имеет собственный предпросмотр с обоими авто; в слоте есть стрелка к карточке авто и подсказка «?» об источниках данных',
        'Compare list: an "Add to compare" button on the plate card, VIN card, model page, favourites and history (the list is kept in your browser); /compare shows it as colour-coded chips you can put into slot A or B. Compare links are now short (plates in Latin letters) with their own link preview naming both cars; each slot has an arrow to the car page and a "?" explaining the data sources'
      ),
      item(
        'data',
        'Типові поломки за даними британських техоглядів (MOT) тепер охоплюють і 2019 рік (разом 2019 та 2021-25): більше перевірок на кожну модель, точніші відсотки відмов; на /about додано джерело UN OCHA для контурів на мапах',
        'Типичные поломки по данным британских техосмотров (MOT) теперь охватывают и 2019 год (вместе 2019 и 2021-25): больше проверок на каждую модель, точнее проценты отказов; на /about добавлен источник UN OCHA для контуров на картах',
        'Common faults from the UK MOT inspections now include 2019 (2019 and 2021-25 together): more checks per model and steadier failure rates; /about now credits UN OCHA for the map outlines'
      ),
      item(
        'improved',
        'Втрати росії оновлюються швидше: нову добу ми підхоплюємо протягом пів години після публікації Генштабу (раніше - до пів дня); на /data-status пояснено, коли джерело публікує дані',
        'Потери россии обновляются быстрее: новые сутки мы подхватываем в течение получаса после публикации Генштаба (раньше - до полудня); на /data-status объяснено, когда источник публикует данные',
        'Russian losses update faster: we pick up a new day within half an hour of the General Staff publishing it (it used to take up to half a day); /data-status now explains when the source publishes'
      ),
      item(
        'improved',
        'Зручніше на телефоні: нові лоти на головній у два рядки (назва й ціна, область і номер), нижчі зображення статей, довгі суми на /auctions скорочено з поясненням у «?», а підказка біля «+» розширеного пошуку більше не залишається після дотику',
        'Удобнее на телефоне: новые лоты на главной в две строки (название и цена, область и номер), более низкие изображения статей, длинные суммы на /auctions сокращены с пояснением в «?», а подсказка у «+» расширенного поиска больше не остается после касания',
        'Easier on a phone: new lots on the home page in two lines (name and price, region and plate), shorter article images, long sums on /auctions abbreviated with the exact value behind a "?", and the hint by the advanced-search "+" no longer sticks after a tap'
      ),
      item(
        'fix',
        'Графік втрат на /alarms показує заглушку під час зміни категорії, тож сторінка більше не підстрибує',
        'График потерь на /alarms показывает заглушку при смене категории, так что страница больше не подпрыгивает',
        'The losses chart on /alarms shows a placeholder while the category changes, so the page no longer jumps'
      )
    ]
  },
  {
    date: '2026-11-05',
    version: 'v2.1063',
    items: [
      item(
        'new',
        'Вкладки на /alarms: «Авто та регіони» - автопарк кожного регіону на тій самій мапі тривог (топ марка чи модель, пальне, країна марки, частка електро) і картка регіону з автопарком, тривогами та ДТП, «Ритм доби» - 24-годинний профіль сьогоднішніх тривог поруч із ДТП за годинами, «Дороги» - аварійно небезпечні ділянки доріг на мапі тривог, та «Тривоги та автопарк» - час під тривогою проти частки електро чи дизеля в регіоні (кореляція, а не причина); кольори тривог не змінюються, а сирена - це загроза, а не удар',
        'Вкладки на /alarms: «Авто и регионы» - автопарк каждого региона на той же карте тревог (топ марка или модель, топливо, страна марки, доля электро) и карточка региона с автопарком, тревогами и ДТП, «Ритм суток» - 24-часовой профиль сегодняшних тревог рядом с ДТП по часам, «Дороги» - аварийно опасные участки дорог на карте тревог, и «Тревоги и автопарк» - время под тревогой против доли электро или дизеля в регионе (корреляция, а не причина); цвета тревог не меняются, а сирена - это угроза, а не удар',
        'Tabs on /alarms: "Cars and regions" puts every region\'s car fleet on the same alert map (top brand or model, fuel, brand country, electric share) with a region card of fleet, alerts and road crashes, "Rhythm of the day" shows the 24-hour shape of today\'s alerts next to road crashes by hour, "Roads" draws hazardous road sections on the alert map, and "Alerts vs fleet" plots time under alert against the electric or diesel share of each region (correlation, not cause); the alert colours never change, and a siren is a threat, not a strike'
      ),
      item(
        'new',
        'Втрати росії на /alarms: орієнтовні дані Генерального штабу за 15 категоріями зі змінами за добу, графік наростання, вікно з деталями та інфографіка, якою можна поділитися; це приблизні цифри, ми зберігаємо власну щоденну копію',
        'Потери россии на /alarms: ориентировочные данные Генерального штаба по 15 категориям с изменением за сутки, график нарастания, окно с деталями и инфографика, которой можно поделиться; это приблизительные цифры, мы храним собственную ежедневную копию',
        "Russian losses on /alarms: the General Staff's approximate figures in 15 categories with the daily change, a running-total chart, a details window and a shareable infographic; the numbers are approximate and we keep our own daily copy"
      ),
      item(
        'new',
        'Тривоги зараз: список активних тривог з часом початку й тривалістю та сьогоднішні цифри (скільки було, найдовша, за годинами й областями); список згорнуто, а тип тривоги підписано',
        'Тревоги сейчас: список активных тревог со временем начала и длительностью и сегодняшние цифры (сколько было, самая долгая, по часам и областям); список свернут, а тип тревоги подписан',
        "Alerts right now: a list of active alerts with start time and duration, and today's numbers (how many, the longest, by hour and region); the list is collapsed and the alert type is labelled"
      ),
      item(
        'improved',
        "Мапа тривог масштабується й перетягується, а райони та громади показано з підписами; на сторінці /data-status з'явилися дані про втрати",
        'Карта тревог масштабируется и перетаскивается, а районы и общины показаны с подписями; на странице /data-status появились данные о потерях',
        'The alert map zooms and drags, with district and community labels; /data-status now lists the war-loss data'
      )
    ]
  },
  {
    date: '2026-11-04',
    version: 'v2.1020',
    items: [
      item(
        'new',
        'Історія тривог на /alarms: скільки часу кожна область була під тривогою за роками (офіційні дані чи волонтерські), поруч з ДТП того ж року; це час під тривогою, а не кількість атак',
        'История тревог на /alarms: сколько времени каждая область была под тревогой по годам (официальные данные или волонтерские), рядом с ДТП того же года; это время под тревогой, а не число атак',
        'Alert history on /alarms: how long each region spent under an air raid alert by year (official or volunteer data), next to the road crashes of the same year; it is time under alert, not a count of attacks'
      ),
      item(
        'new',
        'Повітряні тривоги: мапа областей на /alarms і чип у результаті за номером, якщо в регіоні авто зараз діє тривога; лише інформація, не система оповіщення, а без даних ми так і пишемо',
        'Воздушные тревоги: карта областей на /alarms и чип в результате по номеру, если в регионе авто сейчас действует тревога; только информация, не система оповещения, а без данных мы так и пишем',
        'Air raid alerts: an oblast map at /alarms and a chip on the plate result when the car\'s region has an active alert; informational only, not a warning system, and we say "no data" when the feed is down'
      ),
      item(
        'new',
        'Віртуальний шоурум /showroom: усі авто з оглядом 360°, 3D-моделлю чи посиланням «Налаштувати в 3D» на одній сторінці, плюс офіційні сторінки Morgan, Lucid, Koenigsegg, Aston Martin і Lamborghini; пошук, вигляд сіткою, списком чи галереєю, а посилання зберігає вибір',
        'Виртуальный шоурум /showroom: все авто с обзором 360°, 3D-моделью или ссылкой «Настроить в 3D» на одной странице, плюс официальные страницы Morgan, Lucid, Koenigsegg, Aston Martin и Lamborghini; поиск, вид сеткой, списком или галереей, а ссылка сохраняет выбор',
        'Virtual showroom /showroom: every car with a 360° view, a 3D model or a "Customize in 3D" link on one page, plus official Morgan, Lucid, Koenigsegg, Aston Martin and Lamborghini pages; search, grid, list or gallery layout, and the link keeps your choices'
      ),
      item(
        'improved',
        'Бічне меню: посилання згруповано в шість блоків, дрібніший текст, унизу контакти, карта сайту, стан даних і відгук',
        'Боковое меню: ссылки сгруппированы в шесть блоков, мельче текст, внизу контакты, карта сайта, состояние данных и отзыв',
        'Sidebar: links grouped into six blocks with smaller text, and contact, sitemap, data status and feedback links at the bottom'
      ),
      item(
        'improved',
        'Картка авто: чип «Налаштувати в 3D» веде на відповідну сторінку 3DTuning (потрібне покоління й кузов; якщо не певні, посилання немає)',
        'Карточка авто: чип «Настроить в 3D» ведёт на подходящую страницу 3DTuning (нужное поколение и кузов; если не уверены, ссылки нет)',
        'Car card: a "Customize in 3D" chip links to the matching 3DTuning page (the right generation and body; no link when we are not sure)'
      ),
      item(
        'improved',
        'Лоти СЕТАМ: підстава продажу, категорія стягнення, орган, що видав виконавчий документ, і виконавча служба - з Єдиного реєстру боржників (особа боржника не показується)',
        'Лоты СЕТАМ: основание продажи, категория взыскания, орган, выдавший исполнительный документ, и исполнительная служба - из Единого реестра должников (личность должника не показывается)',
        'SETAM lots: reason for sale, type of enforcement, the body that issued the writ and the enforcement office - from the Unified Register of Debtors (the debtor is not shown)'
      ),
      item(
        'improved',
        'Історія реєстрацій: біля кожного лота є посилання «↓», що відкриває розділ українських аукціонів і прокручує до цього лота; кожен лот можна згорнути, а історію й світові аукціони відкриває посилання на гід /read/auctions',
        'История регистраций: у каждого лота есть ссылка «↓», открывающая раздел украинских аукционов и прокручивающая к этому лоту; каждый лот можно свернуть, а историю и мировые аукционы открывает ссылка на гид /read/auctions',
        'Registration history: each lot has a "↓" link that opens the Ukrainian auctions section and scrolls to that lot; every lot can be collapsed, and the history and world auctions open from a link to the /read/auctions guide'
      ),
      item(
        'improved',
        'Телефон: профіль і сторінка безпеки доріг більше не мають горизонтальної прокрутки, а список небезпечних ділянок читається повністю (код дороги, кілометр, ДТП, назва, посилання)',
        'Телефон: профиль и страница безопасности дорог больше не прокручиваются вбок, а список опасных участков читается полностью (код дороги, километр, ДТП, название, ссылки)',
        'Phone: the profile and road-safety pages no longer scroll sideways, and the hazard list reads in full (road code, kilometre, crashes, name, links)'
      ),
      item(
        'fix',
        'Посилання з #якорем (наприклад, /read/auctions#world) тепер прокручують до потрібного розділу',
        'Ссылки с #якорем (например, /read/auctions#world) теперь прокручивают к нужному разделу',
        'Links with a #anchor (for example /read/auctions#world) now scroll to the right section'
      )
    ]
  },
  {
    date: '2026-11-03',
    version: 'v2.988',
    items: [
      item(
        'improved',
        'Карта небезпечних ділянок на /road-safety тепер на OpenStreetMap: посилання на Street View для кожної точки та кнопка «Поблизу мене»',
        'Карта опасных участков на /road-safety теперь на OpenStreetMap: ссылка на Street View для каждой точки и кнопка «Рядом со мной»',
        'The hazard map on /road-safety now uses OpenStreetMap: a Street View link for every point and a "Near me" button'
      ),
      item(
        'improved',
        'Калькулятор розмитнення: посилання зі сторінки VIN підставляє дані авто, а ціну лота можна ввести в USD, EUR або UAH',
        'Калькулятор растаможки: ссылка со страницы VIN подставляет данные авто, а цену лота можно ввести в USD, EUR или UAH',
        'Customs calculator: the link from the VIN page prefills the car, and a lot price can be entered in USD, EUR or UAH'
      ),
      item(
        'improved',
        'Посилання на фото можна надіслати кнопкою «Поділитися» системного меню телефона',
        'Ссылку на фото можно отправить кнопкой «Поделиться» системного меню телефона',
        'A photo link can be sent with the native Share button of the phone'
      ),
      item(
        'new',
        'Авто на продаж: у розділі «Авто в наявності» реальні оголошення за маркою й моделлю (спершу Україна, а коли українських мало - Європа) з ціною, пробігом і посиланням на оригінал; дані з CarAPIS',
        'Авто на продажу: в разделе «Авто в наличии» реальные объявления по марке и модели (сначала Украина, а когда украинских мало - Европа) с ценой, пробегом и ссылкой на оригинал; данные из CarAPIS',
        'Cars for sale: the Cars in stock section now lists real listings for the make and model (Ukraine first, Europe when Ukraine has few) with price, mileage and a link to the original; data from CarAPIS'
      ),
      item(
        'improved',
        'Авто на продаж: велике вікно зі списком (сітка, рядки, таблиця, сортування) і перемикач валюти цін - USD, EUR, UAH',
        'Авто на продажу: большое окно со списком (сетка, строки, таблица, сортировка) и переключатель валюты цен - USD, EUR, UAH',
        'Cars for sale: a large list view (grid, rows, table, sorting) and a price currency switch - USD, EUR, UAH'
      ),
      item(
        'improved',
        'Під картою на /stats - топ-3 регіони за обраним показником: частка від усієї країни та кількість',
        'Под картой на /stats - топ-3 региона по выбранному показателю: доля от всей страны и количество',
        'Under the /stats map: the top 3 regions for the chosen metric, with their share of the country and the count'
      ),
      item(
        'improved',
        'Графік реєстрацій за місяцями на /stats: перемикач «Легкові / Усі ТЗ» для порівняння з даними лише по легкових авто',
        'График регистраций по месяцам на /stats: переключатель «Легковые / Все ТС» для сравнения с данными только по легковым авто',
        'Registrations by month on /stats: a Cars / All vehicles switch, to compare with passenger-car-only figures'
      ),
      item(
        'new',
        'Графік реєстрацій за місяцями на /stats: останні 12 місяців проти тих самих місяців рік тому, з фільтром нові / імпорт / вторинний ринок',
        'График регистраций по месяцам на /stats: последние 12 месяцев против тех же месяцев год назад, с фильтром новые / импорт / вторичный рынок',
        'Registrations by month on /stats: the last 12 months against the same months a year earlier, filterable to new / imported / resale'
      ),
      item(
        'improved',
        'Статистика (/stats) розбита на вкладки: огляд, рейтинги, походження й реєстр; старі посилання працюють як раніше',
        'Статистика (/stats) разбита на вкладки: обзор, рейтинги, происхождение и реестр; старые ссылки работают как раньше',
        'Statistics (/stats) is split into tabs: overview, rankings, origin and registry; old links keep working'
      ),
      item(
        'new',
        'Діаграма віку автопарку: частка нових авто та авто 1-5, 6-10, 11-20 і 21+ років, з перемикачем % / кількість',
        'Диаграмма возраста автопарка: доля новых авто и авто 1-5, 6-10, 11-20 и 21+ лет, с переключателем % / количество',
        'Fleet age chart: the share of new cars and cars aged 1-5, 6-10, 11-20 and 21+ years, with a % / count toggle'
      )
    ]
  },
  {
    date: '2026-11-02',
    version: 'v2.964',
    items: [
      item(
        'improved',
        'Посилання на розділ сторінки авто (?section=) тепер має власне превʼю в месенджерах, а заголовки превʼю сторінок стали коротшими',
        'Ссылка на раздел страницы авто (?section=) теперь имеет собственное превью в мессенджерах, а заголовки превью страниц стали короче',
        'A link to a section of a vehicle page (?section=) now gets its own preview in messengers, and page preview titles are shorter'
      ),
      item(
        'improved',
        'На сторінці «Обговорення» є посилання на форму зв’язку для приватних повідомлень',
        'На странице «Обсуждение» есть ссылка на форму связи для личных сообщений',
        'The Discussion page links to the contact form for private messages'
      ),
      item(
        'improved',
        'Превʼю посилання на фото у месенджерах показує фото з обведеними номерами',
        'Превью ссылки на фото в мессенджерах показывает фото с обведёнными номерами',
        'A shared photo link preview in messengers shows the photo with the plates outlined'
      ),
      item(
        'improved',
        'Посилання на фото у месенджерах показує більше тексту: опис із позначкою, що фото приватне, і датою завершення дії посилання',
        'Ссылка на фото в мессенджерах показывает больше текста: описание с пометкой, что фото приватное, и датой окончания действия ссылки',
        'A shared photo link in messengers shows more text: a description noting the photo is private, with the date the link expires'
      ),
      item(
        'improved',
        'Перед створенням посилання на фото можна дописати розмиття пензлем або повернути оригінал, а також побачити, що саме видалено з фото; номери на перегляді обведені',
        'Перед созданием ссылки на фото можно дорисовать размытие кистью или вернуть оригинал, а также увидеть, что именно удалено из фото; номера на просмотре обведены',
        'Before creating a photo link you can paint extra blur with a brush or restore the original, see what was removed from the photo, and the plates are outlined in the preview'
      ),
      item(
        'new',
        'У перегляді фото є кнопки «назад» і «далі», а на фото лотів аукціону - позначка збільшення',
        'В просмотре фото есть кнопки «назад» и «дальше», а на фото лотов аукциона - значок увеличения',
        'The photo viewer has previous and next buttons, and auction lot photos carry a zoom badge'
      ),
      item(
        'improved',
        'У «Моїх фото з посиланнями» мініатюру можна відкрити для перегляду; номер у посиланні пишеться схожими латинськими літерами, тож він читається, а не перетворюється на %D0%92…',
        'В «Моих фото со ссылками» миниатюру можно открыть для просмотра; номер в ссылке пишется похожими латинскими буквами, поэтому он читается, а не превращается в %D0%92…',
        'In My shared photos you can click a thumbnail to preview it; the plate in a shared link is written in Latin look-alike letters so it stays readable instead of turning into %D0%92…'
      ),
      item(
        'improved',
        'Сторінки марки та моделі в каталозі більше не «стрибають» під час завантаження',
        'Страницы марки и модели в каталоге больше не «прыгают» при загрузке',
        'Catalog make and model pages no longer jump while loading'
      ),
      item(
        'fix',
        'Кнопка закриття у вікні гонки на телефоні завжди видима; перехід з сторінки марки до аукціонних лотів прокручує до лотів',
        'Кнопка закрытия в окне гонки на телефоне всегда видна; переход со страницы марки к аукционным лотам прокручивает к лотам',
        'The close button in the race window stays visible on phones; opening auctions from a make page scrolls to the lots'
      ),
      item(
        'new',
        'Сторінки моделі та марки в каталозі показують чипи поширеності (рейтинги, де ще продається), 3D- та 360°-перегляд і тест-драйв',
        'Страницы модели и марки в каталоге показывают чипы распространённости (рейтинги, где ещё продаётся), 3D- и 360°-просмотр и тест-драйв',
        'Catalog model and make pages show popularity chips (rankings, where else it is sold), 3D and 360° views and the test drive'
      ),
      item(
        'new',
        'Поділитися фото пошуку за приватним посиланням: обличчя розмиваються автоматично, посилання діє 7 днів, фото можна видалити в профілі («Мої фото з посиланнями»)',
        'Поделиться фото поиска по приватной ссылке: лица размываются автоматически, ссылка действует 7 дней, фото можно удалить в профиле («Мои фото со ссылками»)',
        'Share a photo search by private link: faces are blurred automatically, the link works for 7 days, and you can delete the photo in your profile (My shared photos)'
      ),
      item(
        'new',
        'Сторінка марки /cars/{марка} отримала швидкі посилання (нові авто, сайт бренду, топ-10) і розділи з оглядами, відео, соцмережами та авто в наявності',
        'Страница марки /cars/{марка} получила быстрые ссылки (новые авто, сайт бренда, топ-10) и разделы с обзорами, видео, соцсетями и авто в наличии',
        'The make page /cars/{make} has quick links (new cars, brand site, top 10) and sections with reviews, videos, social and cars in stock'
      ),
      item(
        'improved',
        'Номери поза реєстром (розшук, аукціони) тепер мають повноцінне прев’ю посилання: марка, модель, рік, колір, регіон і тип; сторінка джерел показує тип авто',
        'Номера вне реестра (розыск, аукционы) теперь имеют полноценное превью ссылки: марка, модель, год, цвет, регион и тип; карточка источников показывает тип авто',
        'Plates outside the registry (wanted, auctions) now get a full link preview: make, model, year, colour, region and type; the other-sources card shows the vehicle type'
      ),
      item(
        'improved',
        'На сторінці «Свіжість даних» біля кожного джерела видно дату найновішого запису',
        'На странице «Свежесть данных» у каждого источника видна дата самой новой записи',
        'Data freshness shows the newest record date for each source'
      ),
      item(
        'fix',
        'Логотипи Opel, Jeep, DAF і Forte в грі «Логотипи» частково розмиті, щоб назва не підказувала відповідь; повний екран закривається при виході з гри',
        'Логотипы Opel, Jeep, DAF и Forte в игре «Логотипы» частично размыты, чтобы название не подсказывало ответ; полный экран закрывается при выходе из игры',
        'Opel, Jeep, DAF and Forte logos in the logo quiz are partly blurred so the name does not give the answer away; fullscreen closes when you leave a game'
      ),
      item(
        'fix',
        'Прозорро: довгі номери активів (наприклад, суден) більше не вважаються VIN',
        'Прозорро: длинные номера активов (например, судов) больше не считаются VIN',
        'Prozorro: long asset numbers (for example vessels) are no longer mistaken for VINs'
      ),
      item(
        'improved',
        'Поруч із «Поділитися сторінкою» є QR-код: скануйте телефоном, щоб відкрити сторінку',
        'Рядом с «Поделиться страницей» есть QR-код: сканируйте телефоном, чтобы открыть страницу',
        'Next to Share this page there is a QR code: scan it with your phone to open the page'
      ),
      item(
        'new',
        'На сторінках з даними (розшук, аукціони, безпека доріг, пальне, безпека, новини) з’явилося посилання «Свіжість даних» із датою останнього оновлення',
        'На страницах с данными (розыск, аукционы, безопасность дорог, топливо, безопасность, новости) появилась ссылка «Свежесть данных» с датой последнего обновления',
        'Data pages (wanted, auctions, road safety, fuel, safety, news) now link to Data freshness with the date of the last update'
      ),
      item(
        'data',
        'Прозорро.Продажі: завантажено архів аукціонів (понад 14 тисяч лотів з номером або VIN), далі оновлюється щодня',
        'Прозорро.Продажи: загружен архив аукционов (более 14 тысяч лотов с номером или VIN), дальше обновляется ежедневно',
        'Prozorro.Sale: the auction archive is loaded (over 14 thousand lots with a plate or VIN) and refreshed daily'
      ),
      item(
        'fix',
        'Фото лотів Прозорро.Продажі тепер відкриваються напряму з їхнього сайту',
        'Фото лотов Прозорро.Продажи теперь открываются напрямую с их сайта',
        'Prozorro.Sale lot photos now load directly from their site'
      ),
      item(
        'fix',
        'Завершені аукціони Прозорро з майбутньою датою початку більше не показуються як лоти 2027 року; у статистиці аукціонів середня різниця ціни рахується за медіаною',
        'Завершённые аукционы Прозорро с будущей датой начала больше не показываются как лоты 2027 года; в статистике аукционов средняя разница цены считается по медиане',
        'Finished Prozorro auctions with a future start date no longer show as 2027 lots; the auction stats now use the median price change'
      ),
      item(
        'fix',
        'Підписи обраного на картках результатів більше не обрізаються',
        'Подписи избранного на карточках результатов больше не обрезаются',
        'Favorite labels on result cards are no longer clipped'
      )
    ]
  },
  {
    date: '2026-11-01',
    version: 'v2.905',
    items: [
      item(
        'new',
        'Якщо на фото немає номера, його тепер читає з фото свідоцтва про реєстрацію',
        'Если на фото нет номера, его теперь читает с фото свидетельства о регистрации',
        'When a photo shows no plate, the plate is now read from a registration certificate photo'
      ),
      item(
        'new',
        'В обране можна додавати й номери та VIN, яких немає в реєстрі; ліміт обраного збільшено до 300. Є окремі сторінки /login і /logout та посилання /go/login, /go/signup для поширення',
        'В избранное можно добавлять и номера и VIN, которых нет в реестре; лимит избранного увеличен до 300. Есть отдельные страницы /login и /logout и ссылки /go/login, /go/signup для распространения',
        'Favorites now accept plates and VINs missing from the registry, and the limit is raised to 300; there are separate /login and /logout pages and /go/login, /go/signup share links'
      ),
      item(
        'improved',
        'Номер, знайдений лише в розшуку чи на аукціоні, показується карткою як у реєстрі: фото, регіон і факти з усіх джерел, а збоку - ті самі віджети, що й для авто з реєстру',
        'Номер, найденный только в розыске или на аукционе, показывается карточкой как в реестре: фото, регион и факты из всех источников, а сбоку - те же виджеты, что и для авто из реестра',
        'A plate found only in a wanted list or an auction now gets a registry-style card with photo, region and facts from every source, plus the same side widgets as a registry car'
      ),
      item(
        'improved',
        'На сторінці VIN угорі є короткий опис авто, фото лотів стоять у шапці, а останнім слайдом іде фото моделі з Вікіпедії; на /auctions кольорові значки лотів працюють як фільтри, а лоти мають мініатюри',
        'На странице VIN вверху есть краткое описание авто, фото лотов стоят в шапке, а последним слайдом идёт фото модели из Википедии; на /auctions цветные значки лотов работают как фильтры, а лоты имеют миниатюры',
        'The VIN page opens with a vehicle summary, lot photos sit in the hero followed by the Wikipedia model photo, and on /auctions the colour-coded lot chips work as filters and lots have thumbnails'
      ),
      item(
        'improved',
        'У довіднику теми тепер кольорові й займають два рядки на телефоні; у вікні тест-драйву в заголовку видно регіон номера',
        'В справочнике темы теперь цветные и занимают две строки на телефоне; в окне тест-драйва в заголовке виден регион номера',
        'Guide topic chips are now colour-coded and fit two rows on phones, and the test-drive window shows the plate region in its header'
      ),
      item(
        'fix',
        'У вікторині логотипів розмиваються назви марок усередині самих емблем; у картці збережених порівнянь з’явився порожній стан',
        'В викторине логотипов размываются названия марок внутри самих эмблем; в карточке сохранённых сравнений появилось пустое состояние',
        'The logo quiz now blurs brand names inside the emblems themselves, and the saved comparisons card shows an empty state'
      ),
      item(
        'new',
        'Калькулятор розмитнення авто /customs: мито, акциз за об’ємом двигуна й віком, ПДВ і збір до Пенсійного фонду для бензинових, дизельних, гібридних та електричних авто за правилами 2026 року, за курсом євро НБУ; кожен крок видно, а посилання зі сторінки VIN заповнює форму саме. Це оцінка, остаточну суму визначає митниця',
        'Калькулятор растаможки авто /customs: пошлина, акциз по объёму двигателя и возрасту, НДС и сбор в Пенсионный фонд для бензиновых, дизельных, гибридных и электрических авто по правилам 2026 года, по курсу евро НБУ; каждый шаг виден, а ссылка со страницы VIN сама заполняет форму. Это оценка, окончательную сумму определяет таможня',
        'A new /customs calculator estimates the cost of bringing a car into Ukraine: duty, excise by engine size and age, VAT and the pension fee for petrol, diesel, hybrid and electric cars under the 2026 rules, at the NBU euro rate; every step is shown, and a link from the VIN page fills the form in. An estimate, the customs office sets the final amount'
      ),
      item(
        'improved',
        'Довідник /read/auctions розповідає і про Prozorro.Продажі: хто продає авто (митниця, банкрутство, банки, АРМА), приклади реальних проданих лотів і джерело відкритих даних',
        'Справочник /read/auctions рассказывает и о Prozorro.Продажи: кто продаёт авто (таможня, банкротство, банки, АРМА), примеры реальных проданных лотов и источник открытых данных',
        'The /read/auctions guide now covers Prozorro.Sale: who sells the cars (customs, bankruptcy, banks, ARMA), examples of real sold lots and the open-data source'
      ),
      item(
        'new',
        'У розділі «Акції» тепер усі інструменти компанії марки: прості та привілейовані акції, ADR, позабіржові рядки та лістинги на інших біржах, кожен зі своїм графіком, поясненням, біржею, діапазоном за 52 тижні, обсягом і посиланнями на Yahoo Finance та TradingView; додано пояснення про облігації',
        'В разделе «Акции» теперь все инструменты компании марки: обычные и привилегированные акции, ADR, внебиржевые строки и листинги на других биржах, каждый со своим графиком, пояснением, биржей, диапазоном за 52 недели, объёмом и ссылками на Yahoo Finance и TradingView; добавлено пояснение об облигациях',
        'The Share price section now covers every instrument of the maker: ordinary and preferred shares, ADRs, OTC lines and second listings, each with its own chart, explanation, exchange, 52-week range, volume and Yahoo Finance / TradingView links, plus a note on bonds'
      ),
      item(
        'new',
        'Розділ «Акції» з ціною акцій виробника марки та графіком за день, місяць або рік: тепер і на телефоні, на сторінках моделей і марок каталогу, а не лише збоку на комп’ютері',
        'Раздел «Акции» с ценой акций производителя марки и графиком за день, месяц или год: теперь и на телефоне, на страницах моделей и марок каталога, а не только сбоку на компьютере',
        'A new Share price section shows the maker’s share price and a 1-day, 1-month or 1-year chart: now on phones and on the catalog model and make pages, not only in the desktop side panel'
      ),
      item(
        'new',
        'Українські аукціони тепер і з Прозорро.Продажів: лоти митниці, банкрутства, приватизації та банків з номером або VIN авто, з фото, продавцем і значками, поруч із лотами СЕТАМ; на /auctions є вкладки джерел і фільтри за категорією та типом торгів',
        'Украинские аукционы теперь и с Прозорро.Продажи: лоты таможни, банкротства, приватизации и банков с номером или VIN авто, с фото, продавцем и значками, рядом с лотами СЕТАМ; на /auctions есть вкладки источников и фильтры по категории и типу торгов',
        'Ukrainian auctions now include Prozorro.Sale: customs, bankruptcy, privatization and bank lots with a car plate or VIN, with photos, seller and chips, next to the SETAM lots; /auctions has source tabs and filters by category and auction type'
      ),
      item(
        'fix',
        'Сторінка /data-status більше не видає помилку, поки статистика реєстру ще не перераховується: дати просто не показуються',
        'Страница /data-status больше не выдаёт ошибку, пока статистика реестра ещё не пересчитывается: даты просто не показываются',
        'The /data-status page no longer errors while the registry statistics are still being rebuilt; the dates are simply left out'
      ),
      item(
        'new',
        'Сторінка /data-status: за який період реєстри в базі, коли востаннє оновлювалось кожне джерело (щодня, щомісяця, раз на пів року) і що застаріло. Підпис на /stats тепер показує реальну останню дату даних, а не поточний місяць',
        'Страница /data-status: за какой период реестры в базе, когда в последний раз обновлялся каждый источник (ежедневно, ежемесячно, раз в полгода) и что устарело. Подпись на /stats теперь показывает реальную последнюю дату данных, а не текущий месяц',
        'A new /data-status page shows the period the registries cover, when each source was last updated (daily, monthly, twice a year) and what is stale. The /stats label now shows the real last date of the data instead of the current month'
      ),
      item(
        'new',
        'Сторінка /sitemap: карта сайту з усіма сторінками за розділами, а також підказки про меню, фон, дзвіночок і профіль; посилання на неї внизу кожної сторінки',
        'Страница /sitemap: карта сайта со всеми страницами по разделам, а также подсказки о меню, фоне, колокольчике и профиле; ссылка на неё внизу каждой страницы',
        'A new /sitemap page lists every page by section, with notes on the menu, background, bell and profile; it is linked in the footer of every page'
      ),
      item(
        'improved',
        'Сторінка «Релакс»: пояснення, вибір фону прямо на сторінці (і на телефоні) та дзен-режим, що ховає все, крім фону; на сторінках тест-драйву й релаксу з’явилися посилання на всі ігри',
        'Страница «Релакс»: пояснение, выбор фона прямо на странице (и на телефоне) и дзен-режим, который прячет всё, кроме фона; на страницах тест-драйва и релакса появились ссылки на все игры',
        'The Relax page now explains itself, lets you pick the background right there (phones too) and has a zen mode that hides everything but the background; the test drive and relax pages link to every game'
      ),
      item(
        'improved',
        'Ігри на /play отримали плитки-постери, а довідник /read - плитки як у блозі; вікторина «Регіон» стала зручнішою на телефоні',
        'Игры на /play получили плитки-постеры, а справочник /read - плитки как в блоге; викторина «Регион» стала удобнее на телефоне',
        'The /play games now have poster tiles and the /read guides hub has blog-style tiles; the region quiz is easier on phones'
      ),
      item(
        'improved',
        'У блоці «Також знайдено» вибраний номер підсвічено, а в аукціонних лотах рядок авто показується, навіть коли VIN не назвав марку; довгі назви доріг у /road-safety тепер переносяться',
        'В блоке «Также найдено» выбранный номер подсвечен, а в аукционных лотах строка авто показывается, даже когда VIN не назвал марку; длинные названия дорог в /road-safety теперь переносятся',
        'The selected plate is highlighted in "Also found", auction lots show the vehicle line even when the VIN decode names no make, and long road names wrap on /road-safety'
      ),
      item(
        'improved',
        'Довідник: пошук і фільтр за темами, позначка «Стаття» на кожній картці та компактні картки на телефоні',
        'Справочник: поиск и фильтр по темам, пометка «Статья» на каждой карточке и компактные карточки на телефоне',
        'Guides: search and topic filter, a "Guide" label on every card and compact cards on phones'
      ),
      item(
        'improved',
        'На головній сторінці пошуку прибрано рядок «Безкоштовно, без реклами, відкриті дані» під слоганом; він лишається в шапці сайту',
        'На главной странице поиска убрана строка «Бесплатно, без рекламы, открытые данные» под слоганом; она остается в шапке сайта',
        'The search page no longer repeats the "Free, no ads, open data" line under the tagline; it stays in the site header'
      ),
      item(
        'improved',
        'Стаття /read/safety тепер пов’язує краш-тести з безпекою доріг: загиблі за роками, частка пішоходів і дітей, види й причини ДТП, пік за годиною та днем і що з цього перевіряють тести',
        'Статья /read/safety теперь связывает краш-тесты с безопасностью дорог: погибшие по годам, доля пешеходов и детей, виды и причины ДТП, пик по часу и дню и что из этого проверяют тесты',
        'The /read/safety article now ties crash tests to road safety: deaths by year, the share of pedestrians and children, crash types and causes, the peak hour and weekday, and which of these the tests cover'
      ),
      item(
        'new',
        'На сторінках /stats, /wanted, /auctions, /fuel, /safety і /road-safety угорі з’явився блок «Джерела даних», а внизу блок «Пов’язана статистика» з посиланнями на сусідні сторінки і підказкою, що там побачити',
        'На страницах /stats, /wanted, /auctions, /fuel, /safety и /road-safety вверху появился блок «Источники данных», а внизу блок «Связанная статистика» со ссылками на соседние страницы и подсказкой, что там увидеть',
        'The /stats, /wanted, /auctions, /fuel, /safety and /road-safety pages now open with a "Source data" block and end with a "Related statistics" block linking to the neighbouring pages with a hint of what to look for there'
      ),
      item(
        'new',
        'Сторінка /road-safety зі статистикою ДТП за даними Патрульної поліції: загиблі й ДТП за областями (також на 100 000 зареєстрованих авто), дороги державного значення, причини й види ДТП, година й день тижня, вибір року; це зведені дані без марок і моделей, тож не ризик окремої моделі',
        'Страница /road-safety со статистикой ДТП по данным Патрульной полиции: погибшие и ДТП по областям (также на 100 000 зарегистрированных авто), дороги государственного значения, причины и виды ДТП, час и день недели, выбор года; это сводные данные без марок и моделей, поэтому не риск отдельной модели',
        'A new /road-safety page with road crash statistics from Patrol Police data: deaths and crashes by region (also per 100,000 registered cars), state roads, crash causes and types, hour and weekday, with a year picker; the figures are aggregates without makes or models, so not a per-model risk'
      ),
      item(
        'new',
        'На /road-safety: джерела даних, цікаві випадки, зв’язок кількості зареєстрованих авто з ДТП за областями та аварійно небезпечні ділянки доріг зі списком і мапою',
        'На /road-safety: источники данных, интересные случаи, связь числа зарегистрированных авто с ДТП по областям и аварийно опасные участки дорог со списком и картой',
        'The /road-safety page now shows its source data, interesting cases, how registered cars relate to crashes by region, and hazardous road sections as a list and a map'
      ),
      item(
        'new',
        'У картці номера з’явився чип з ДТП в області номера (кількість за рік і місце за загиблими), який веде на /road-safety',
        'В карточке номера появился чип с ДТП в области номера (число за год и место по погибшим), который ведет на /road-safety',
        'The plate card now shows a chip with road crashes in the plate region (count for the year and rank by deaths), linking to /road-safety'
      )
    ]
  },
  {
    date: '2026-10-31',
    version: 'v2.817',
    items: [
      item(
        'new',
        'На головній сторінці з’явилися блоки з свіжими номерами з розшуку («Гарпун») і найновішими лотами аукціонів',
        'На главной странице появились блоки со свежими номерами из розыска («Гарпун») и новейшими лотами аукционов',
        'The home page has new blocks with recent wanted plates (Garpun) and the newest auction lots'
      ),
      item(
        'improved',
        'Новий слоган і позначка «Безкоштовно, без реклами, відкриті дані» на головній і в описах посилань',
        'Новый слоган и пометка «Бесплатно, без рекламы, открытые данные» на главной и в описаниях ссылок',
        'A new slogan and a "Free, no ads, open data" note on the home page and in link previews'
      ),
      item(
        'improved',
        'В іграх-вікторинах з’явилася кнопка «на весь екран»',
        'В играх-викторинах появилась кнопка «на весь экран»',
        'The quiz games have a full-screen button'
      ),
      item(
        'improved',
        'Каталог авто і розширений пошук тепер пов’язані перехресними посиланнями',
        'Каталог авто и расширенный поиск теперь связаны перекрёстными ссылками',
        'The car catalog and advanced search now link to each other'
      ),
      item(
        'improved',
        'На сторінці VIN у блоці «типові дані моделі» з’явився розділ «Відкликання»: кампанії ЄС (RDW), США (NHTSA) і Канади та скарги власників, як і на картці номера; це дані по моделі й року, а не по цьому VIN',
        'На странице VIN в блоке «типичные данные модели» появился раздел «Отзывы»: кампании ЕС (RDW), США (NHTSA) и Канады и жалобы владельцев, как и на карточке номера; это данные по модели и году, а не по этому VIN',
        'The VIN page now has a "Recalls" section inside the typical model data: EU (RDW), US (NHTSA) and Canadian campaigns plus owner complaints, as on the plate card; model and year level, not specific to this VIN'
      ),
      item(
        'new',
        'У розділі аукціонів з’явилася група «Історія ДТП (платні звіти)»: посилання на carVertical, AutoDNA, Carfax і AutoCheck, бо жодне безкоштовне джерело не показує ДТП окремого авто; VIN копіюється, ми нічого не надсилаємо',
        'В разделе аукционов появилась группа «История ДТП (платные отчёты)»: ссылки на carVertical, AutoDNA, Carfax и AutoCheck, так как ни один бесплатный источник не показывает ДТП отдельного авто; VIN копируется, мы ничего не отправляем',
        'The auctions section has a new "Crash history (paid reports)" group linking to carVertical, AutoDNA, Carfax and AutoCheck, since no free source shows the accidents of a single car; the VIN is copied and we send nothing'
      ),
      item(
        'new',
        'Пошук за номером, якого немає в реєстрі, тепер перевіряє списки розшуку (авто та «Гарпун», зокрема старі номери) і лоти СЕТАМ: якщо збіг є, показано банер про інше джерело, відомі дані про авто та VIN, а за наявності VIN - повну картку VIN; розділи розшуку й аукціонів відкриті одразу, а на сторінці VIN вони тепер враховують і номер',
        'Поиск по номеру, которого нет в реестре, теперь проверяет списки розыска (авто и «Гарпун», в том числе старые номера) и лоты СЕТАМ: при совпадении показан баннер об ином источнике, известные данные об авто и VIN, а при наличии VIN - полная карточка VIN; разделы розыска и аукционов открыты сразу, а на странице VIN они теперь учитывают и номер',
        'Searching a plate that is not in the registry now checks the wanted lists (vehicles and "Garpun", including old plates) and SETAM lots: on a match you get a banner about the other source, the vehicle data and VIN, and with a VIN the full VIN card; the wanted and auction sections open right away, and on the VIN page they now use the plate as well'
      ),
      item(
        'new',
        'В історії авто на картці з’явилися події розшуку: коли транспортний засіб чи номерний знак (Гарпун) внесли до списку й коли зняли, поряд з реєстраційними операціями та аукціонами; розділ тепер називається «Історія авто»',
        'В истории авто на карточке появились события розыска: когда транспортное средство или номерной знак (Гарпун) внесли в список и когда сняли, рядом с регистрационными операциями и аукционами; раздел теперь называется «История авто»',
        'The car history on the card now shows wanted-list events: when a vehicle or a plate (Garpun) was put on the list and when it was removed, next to the registration operations and auctions; the section is now called "Car history"'
      ),
      item(
        'improved',
        'На сторінках моделей каталогу з’явилася кнопка «Показати номери»: показує найновіші зареєстровані авто цієї моделі',
        'На страницах моделей каталога появилась кнопка «Показать номера»: показывает самые новые зарегистрированные авто этой модели',
        'Catalog model pages have a "Show plates" button that lists the newest registered cars of the model'
      ),
      item(
        'improved',
        'У грі «Вгадай марку» назва під емблемою тепер розмита, доки не оберете відповідь',
        'В игре «Угадай марку» название под эмблемой теперь размыто, пока не выберете ответ',
        'In the "Guess the brand" game the name under the emblem is now blurred until you pick an answer'
      ),
      item(
        'new',
        'Довідник /read/auctions: що таке лот на українському аукціоні арештованого майна, як узяти участь, цифри з наших даних про лоти СЕТАМ, практика США й Британії, коротка історія аукціонів і що перевірити перед ставкою',
        'Справочник /read/auctions: что такое лот на украинском аукционе арестованного имущества, как принять участие, цифры из наших данных о лотах СЕТАМ, практика США и Британии, краткая история аукционов и что проверить перед ставкой',
        'New /read/auctions guide: what a lot is at a Ukrainian auction of seized property, how to take part, figures from our SETAM lot data, practice in the USA and the UK, a short history of auctions and what to check before you bid'
      ),
      item(
        'new',
        'На картці авто з лотом СЕТАМ з’явився рядок «Перевірка ціни» (ціна продажу проти медіани інших проданих лотів тієї ж моделі), а в історії реєстрацій - позначки «На аукціоні» з місяцем і ціною',
        'На карточке авто с лотом СЕТАМ появилась строка «Проверка цены» (цена продажи против медианы других проданных лотов той же модели), а в истории регистраций - отметки «На аукционе» с месяцем и ценой',
        'The car card shows a "Price check" line for a SETAM lot (sale price against the median of other sold lots of the same model), and the registration history has "At auction" markers with the month and price'
      ),
      item(
        'new',
        'Сторінка /wanted має вкладку «Номерні знаки (Гарпун)»: статистика розшуку номерів за роком події, регіоном (таблиця й карта) та підрозділом поліції, список нещодавно внесених номерів, пояснення до обох вкладок і плавна зміна вмісту; на сторінках марок каталогу з’явився рядок «На українських аукціонах» (лоти, продано, медіана ціни) з посиланням на лоти марки, а на /auctions - нові картки: частка проданих, сума продажів і лоти, виставлені повторно',
        'Страница /wanted получила вкладку «Номерные знаки (Гарпун)»: статистика розыска номеров по году события, региону (таблица и карта) и подразделению полиции, список недавно внесённых номеров, пояснения к обеим вкладкам и плавная смена содержимого; на страницах марок каталога появилась строка «На украинских аукционах» (лоты, продано, медиана цены) со ссылкой на лоты марки, а на /auctions - новые карточки: доля проданных, сумма продаж и повторно выставленные лоты',
        'The /wanted page has a "Plates (Garpun)" tab: statistics of wanted plates by year of the event, region (table and map) and police unit, a list of the most recent plates, an explainer on both tabs and a smooth content shift; catalog make pages show an "At Ukrainian auctions" line (lots, sold, median price) linking to the lots of that make, and /auctions has new cards: sold share, total sales and re-listed lots'
      ),
      item(
        'new',
        'Розділ «Українські аукціони» на картці авто й сторінці VIN: лоти торгів СЕТАМ арештованим і конфіскованим майном, де згадано номер або VIN (номер лота, статус, стартова й кінцева ціна, регіон), усі лоти від новіших до старіших, продані виділено; значок «З аукціону» в шапці, коротка історія торгів і порівняння із закордонною практикою',
        'Раздел «Украинские аукционы» на карточке авто и странице VIN: лоты торгов СЕТАМ арестованным и конфискованным имуществом, где упомянут номер или VIN (номер лота, статус, стартовая и конечная цена, регион), все лоты от новых к старым, проданные выделены; значок «С аукциона» в шапке, краткая история торгов и сравнение с зарубежной практикой',
        'A "Ukrainian auctions" section on the plate card and VIN page: SETAM auction lots of seized and confiscated property that name the plate or VIN (lot number, status, starting and sale price, region), all lots newest first with sold ones highlighted; a "From auction" chip in the header, a short history of the auctions and a comparison with practice abroad'
      ),
      item(
        'new',
        'Сторінка /auctions: усі лоти українських аукціонів арештованих авто (СЕТАМ) зі статистикою за регіонами, марками, роками й місяцями (скільки продано, середня різниця між ціною продажу й стартовою, медіана ціни), фільтрами за маркою, регіоном, статусом, результатом і ціною, блоком нових відкритих лотів і посиланням на кожен лот',
        'Страница /auctions: все лоты украинских аукционов арестованных авто (СЕТАМ) со статистикой по регионам, маркам, годам и месяцам (сколько продано, средняя разница между ценой продажи и стартовой, медиана цены), фильтрами по марке, региону, статусу, результату и цене, блоком новых открытых лотов и ссылкой на каждый лот',
        'An /auctions page: every lot of the Ukrainian seized-car auctions (SETAM) with statistics by region, make, year and month (how many sold, average sale vs start price, median price), filters by make, region, status, result and price, a block of the newest open lots, and a link to each lot'
      ),
      item(
        'improved',
        'Номер лота в розділі «Українські аукціони» тепер є посиланням: відкриває цей лот на сайті СЕТАМ',
        'Номер лота в разделе «Украинские аукционы» теперь ссылка: открывает этот лот на сайте СЕТАМ',
        'The lot number in the "Ukrainian auctions" section is now a link that opens that lot on the SETAM site'
      ),
      item(
        'new',
        'Перевірка розшуку тепер охоплює й другий список Нацполіції «Гарпун» (номерні знаки в розшуку, оновлюється щодня): якщо номер там є, на картці з’являється жовтий значок «Гарпун» і пояснення, що розшук номера ще не доводить викрадення авто, а також історія зі списку',
        'Проверка розыска теперь охватывает и второй список Нацполиции «Гарпун» (номерные знаки в розыске, обновляется ежедневно): если номер там есть, на карточке появляется жёлтый значок «Гарпун» и пояснение, что розыск номера ещё не доказывает угон авто, а также история из списка',
        'The wanted check now also covers the second National Police list, "Garpun" (wanted licence plates, refreshed daily): if the plate is there, the card shows an amber "Garpun" chip and a note that a wanted plate does not prove the car is stolen, plus the plate\'s history on the list'
      ),
      item(
        'new',
        'Сторінка /contact: форма зв’язку, що приватно доходить до команди (поштову адресу не публікуємо), і можливість замовити новий застосунок; авторизовані пишуть одразу, анонімні підтверджують пошту кодом з листа, одне повідомлення раз на 10 хвилин; посилання «© рік carsua.app» тепер у футері кожної сторінки',
        'Страница /contact: форма связи, которая приватно доходит до команды (почтовый адрес не публикуем), и возможность заказать новое приложение; авторизованные пишут сразу, анонимные подтверждают почту кодом из письма, одно сообщение раз в 10 минут; ссылка «© год carsua.app» теперь в футере каждой страницы',
        'A /contact page: a form that reaches the team privately (no email address is published) and a way to order a new app; signed-in users write directly, anonymous senders confirm their email with an emailed code, one message per 10 minutes; a "© year carsua.app" link now sits in the footer of every page'
      ),
      item(
        'improved',
        'Сторінка «Про застосунок»: коротка добірка всіх можливостей перед докладним описом; Cloudflare Turnstile і Resend в джерелах згадують і форму зв’язку',
        'Страница «О приложении»: краткая подборка всех возможностей перед подробным описанием; Cloudflare Turnstile и Resend в источниках упоминают и форму связи',
        'About page: a short overview of every feature above the detailed list; the Cloudflare Turnstile and Resend sources now mention the contact form too'
      )
    ]
  },
  {
    date: '2026-10-30',
    version: 'v2.752',
    items: [
      item(
        'new',
        'Порівняння двох авто на /compare: номер, VIN або модель у кожному полі, таблиця поруч лише з наявними даними (потужність, розміри, вага, витрата, ціна, безпека, надійність, облік в Україні) і окремо дані саме цього авто. Кнопка «Порівняти» є на картці номера, VIN і сторінці моделі.',
        'Сравнение двух авто на /compare: номер, VIN или модель в каждом поле, таблица рядом только с имеющимися данными (мощность, размеры, вес, расход, цена, безопасность, надёжность, учёт в Украине) и отдельно данные именно этого авто. Кнопка «Сравнить» есть на карточке номера, VIN и странице модели.',
        'Compare two cars at /compare: a plate, a VIN or a model in each slot, a side-by-side table with only the data we hold (power, size, weight, consumption, price, safety, reliability, registrations in Ukraine) and own data of the exact car kept apart. A Compare button sits on the plate card, the VIN card and the model page.'
      ),
      item(
        'new',
        'Порівняння авто: меню «Зберегти порівняння» (буфер, txt, md, csv, docx, pdf), збережені порівняння в цьому браузері, підказки для другого авто (та сама модель з іншим паливом, попереднє покоління, сусідні моделі) та кнопка «Додати до порівняння» у каталозі з нижньою панеллю.',
        'Сравнение авто: меню «Сохранить сравнение» (буфер, txt, md, csv, docx, pdf), сохранённые сравнения в этом браузере, подсказки для второго авто (та же модель с другим топливом, предыдущее поколение, соседние модели) и кнопка «Добавить к сравнению» в каталоге с нижней панелью.',
        'Compare: a "Save comparison" menu (clipboard, txt, md, csv, docx, pdf), comparisons saved in this browser, suggestions for the second car (same model on another fuel, previous generation, sibling models) and an "Add to compare" button in the catalog with a bottom bar.'
      ),
      item(
        'improved',
        'Порівняння авто: діапазони мін-медіана-макс на одній шкалі від нуля (вузькі показники масштабуються), зірки краш-тестів і CO₂ на шкалі картки, криві ціни в Нідерландах і відмов MOT за пробігом, покоління обох моделей двома стрічками та вміщення в паркомісця й гаражі.',
        'Сравнение авто: диапазоны мин-медиана-макс на одной шкале от нуля (узкие показатели масштабируются), звёзды краш-тестов и CO₂ на шкале карточки, кривые цены в Нидерландах и отказов MOT по пробегу, поколения обеих моделей двумя лентами и вместимость в парковки и гаражи.',
        'Compare: min-median-max ranges on one scale from zero (narrow measures are zoomed), crash-test stars and CO₂ on the result-card scale, Dutch price and MOT failure curves by mileage, the generations of both models as two timelines, and parking and garage fit.'
      ),
      item(
        'improved',
        'Порівняння авто: головні відмінності кожного авто, дзеркальні стовпчики, радари (динаміка, практичність, економія, безпека), частки палива й кузова, габарити обох авто в одному масштабі (поруч, накладення, з рухомим розділювачем, креслення), редагування марки, моделі й року та посилання на кожен блок.',
        'Сравнение авто: главные отличия каждого авто, зеркальные столбцы, радары (динамика, практичность, экономия, безопасность), доли топлива и кузова, габариты обоих авто в одном масштабе (рядом, наложение, с подвижным разделителем, чертёж), правка марки, модели и года и ссылки на каждый блок.',
        'Compare: the main differences of each car, mirrored bars, radars (performance, practicality, economy, safety), fuel and body shares, both cars at true scale (side by side, overlay, draggable divider, blueprint), editing the make, model and year of a slot, and a link to every block.'
      ),
      item(
        'new',
        'Сторінка «Поділитися пошуком»: короткі посилання /go/… на пошук за номером, VIN, фото та AR-скан. Кожне має власне превʼю в месенджерах і відкриває головну з підсвіченою потрібною кнопкою; є вибір мови й мітка джерела.',
        'Страница «Поделиться поиском»: короткие ссылки /go/… на поиск по номеру, VIN, фото и AR-скан. У каждой своё превью в мессенджерах, и она открывает главную с подсвеченной нужной кнопкой; есть выбор языка и метка источника.',
        'Share a search page: short /go/… links to plate, VIN, photo and AR-scan search. Each has its own preview in messengers and opens the home page with the matching button highlighted; pick a language and add a source tag.'
      ),
      item(
        'new',
        'Каталог моделей: сторінки /cars/{марка}/{модель} з кількістю авто на обліку в Україні, роками випуску, паливом, кузовом, кольорами й регіонами, плюс характеристики, вартість, відкликання, відгуки та фото моделі. Спершу найпоширеніші 300 моделей.',
        'Каталог моделей: страницы /cars/{марка}/{модель} с количеством авто на учёте в Украине, годами выпуска, топливом, кузовом, цветами и регионами, плюс характеристики, стоимость, отзывы и фото модели. Сначала самые распространённые 300 моделей.',
        'Model catalog: /cars/{make}/{model} pages with how many cars are registered in Ukraine, model years, fuel, body, colours and regions, plus specs, value, recalls, reviews and photos of the model. The 300 most common models come first.'
      ),
      item(
        'new',
        'Огляд за марками: сторінки /cars і /cars/{марка} зі списком марок та моделей, кількістю авто на обліку, навігацією «хлібні крихти» і швидкими переходами між моделями однієї марки.',
        'Обзор по маркам: страницы /cars и /cars/{марка} со списком марок и моделей, количеством авто на учёте, навигацией «хлебные крошки» и быстрыми переходами между моделями одной марки.',
        'Browse by make: /cars and /cars/{make} pages listing the makes and models with how many cars are registered, breadcrumb navigation and quick jumps between models of one make.'
      ),
      item(
        'improved',
        'Каталог авто: пункт «Авто за марками» у бічному меню, моделі марки в таблиці з пошуком, а чипи поколінь показують кількість авто та статистику поколінь.',
        'Каталог авто: пункт «Авто по маркам» в боковом меню, модели марки в таблице с поиском, а чипы поколений показывают количество авто и статистику поколений.',
        'Car catalog: a "Cars by make" sidebar entry, the models of each make in a searchable table, and generation chips with car counts and per-generation stats.'
      ),
      item(
        'improved',
        'Сторінка моделі: чипи року, покоління, пального й кузова - характеристики, вартість і відкликання одразу підлаштовуються під вибір.',
        'Страница модели: чипы года, поколения, топлива и кузова - характеристики, стоимость и отзывы сразу подстраиваются под выбор.',
        'Model page: year, generation, fuel and body chips - specs, value and recalls follow your pick.'
      ),
      item(
        'improved',
        'Марка й модель на картці авто за номером, чип на картці VIN і топ моделей на сторінці статистики тепер ведуть на сторінку моделі в каталозі.',
        'Марка и модель на карточке авто по номеру, чип на карточке VIN и топ моделей на странице статистики теперь ведут на страницу модели в каталоге.',
        'The make and model on a plate card, a chip on the VIN card and the top models on the stats page now link to the model page in the catalog.'
      ),
      item(
        'improved',
        'Малюнок габаритів: креслення за замовчуванням, вкладки «Креслення / Колір», вид спереду та збереження в PNG.',
        'Рисунок габаритов: чертёж по умолчанию, вкладки «Чертёж / Цвет», вид спереди и сохранение в PNG.',
        'Size drawing: blueprint by default, Blueprint / Colour tabs, a front view and Save as PNG.'
      ),
      item(
        'improved',
        'VIN: для європейських номерів модель підбирається за кодом, для японських, корейських і китайських авто в розділі аукціонів є посилання на історію в країні походження, а для авто з ЄС - на Historia Pojazdu.',
        'VIN: для европейских номеров модель подбирается по коду, для японских, корейских и китайских авто в разделе аукционов есть ссылки на историю в стране происхождения, а для авто из ЕС - на Historia Pojazdu.',
        'VIN: EU numbers now get a model guess from the code, Japanese, Korean and Chinese cars get country-of-origin history links in the auction section, and EU cars a link to Historia Pojazdu.'
      ),
      item(
        'improved',
        'Посилання на розділ (?section=) тепер мають власні заголовок і опис у превʼю; каталог показує кількість авто за поколіннями, а моделі, паливо й регіони - українською, російською чи англійською.',
        'Ссылки на раздел (?section=) теперь имеют собственные заголовок и описание в превью; каталог показывает количество авто по поколениям, а топливо, кузов и регионы - на выбранном языке.',
        'Links to a section (?section=) now have their own title and description in previews; the catalog shows car counts per generation, and fuel, body and regions in your language.'
      )
    ]
  },
  {
    date: '2026-10-29',
    version: 'v2.703',
    items: [
      item(
        'improved',
        'Розширений пошук: логотипи марок, значки типу, кольору, пального й статусу в результатах, згорнута легенда значків і швидший пошук за маркою та моделлю.',
        'Расширенный поиск: логотипы марок, значки типа, цвета, топлива и статуса в результатах, сворачиваемая легенда значков и более быстрый поиск по марке и модели.',
        'Advanced search: brand logos, kind, colour, fuel and status icons in the results, a collapsible legend of the icons, and a faster make and model search.'
      ),
      item(
        'improved',
        'Новини: заголовок і кнопки в один рядок, кожне джерело має свій колір, а під час завантаження показуються заглушки замість застарілого списку. Сторінки застосунку мають однакову ширину.',
        'Новости: заголовок и кнопки в одну строку, у каждого источника свой цвет, а при загрузке показываются заглушки вместо устаревшего списка. Страницы приложения имеют одинаковую ширину.',
        'News: the title and buttons share one row, each source has its own colour, and loading shows placeholders instead of a stale list. App pages now share one width.'
      ),
      item(
        'improved',
        'Пошук за фото: під час розпізнавання видно стан, а на повільному зʼєднанні зʼявляється підказка. Зменшення фото більше не гальмує сторінку.',
        'Поиск по фото: во время распознавания виден статус, а на медленном соединении появляется подсказка. Уменьшение фото больше не тормозит страницу.',
        'Photo search: a status line shows while reading, with a hint on a slow connection. Shrinking the photo no longer slows the page.'
      ),
      item(
        'improved',
        'Контури збоку у малюнках транспорту обведені за реальними фото кузовів (седан, хетчбек, універсал, купе, SUV, MPV, фургон, пікап); у гіді «Типи кузова» для пікапа додано Hilux, Ranger і Amarok.',
        'Контуры сбоку в рисунках транспорта обведены по реальным фото кузовов (седан, хэтчбек, универсал, купе, SUV, MPV, фургон, пикап); в гиде «Типы кузова» для пикапа добавлены Hilux, Ranger и Amarok.',
        'Side outlines in the vehicle drawings are traced from real body-style photos (sedan, hatch, wagon, coupe, SUV, MPV, van, pickup); the Body types guide adds Hilux, Ranger and Amarok to the pickup.'
      ),
      item(
        'improved',
        'Реалістичніші малюнки транспорту: боковий вигляд і вигляд зверху з колісними арками, склінням, фарами й дзеркалами (розміри, гараж, парковка, гіди), нові схеми буксирування, а також окремі значки для мопеда, квадроцикла, трицикла, фургона, вантажівки та напівпричепа. Усі малюнки оригінальні.',
        'Более реалистичные рисунки транспорта: вид сбоку и сверху с колёсными арками, остеклением, фарами и зеркалами (размеры, гараж, парковка, гиды), новые схемы буксировки, а также отдельные значки для мопеда, квадроцикла, трицикла, фургона, грузовика и полуприцепа. Все рисунки оригинальные.',
        'More realistic vehicle drawings: side and top views with wheel arches, glass, lamps and mirrors (sizes, garage, parking, guides), new towing diagrams, and separate icons for a moped, quad, tricycle, van, truck and semi-trailer. All artwork is original.'
      ),
      item(
        'new',
        'Нова сторінка /play з іграми: вгадай область за номером на мапі, вгадай марку за логотипом і «більше чи менше» за даними реєстру. Найкращий результат зберігається на пристрої, результатом можна поділитися картинкою.',
        'Новая страница /play с играми: угадай область по номеру на карте, угадай марку по логотипу и «больше или меньше» по данным реестра. Лучший результат хранится на устройстве, результатом можно поделиться картинкой.',
        'A new /play page with games: guess the region from a plate on the map, guess the brand from its logo, and higher or lower on registry counts. The best score is kept on your device and a score can be shared as a picture.'
      ),
      item(
        'improved',
        'Сторінка «Про проєкт»: повний короткий перелік можливостей (ШІ-агенти, план розвитку) і нове джерело - Fooocus для банерів гідів.',
        'Страница «О проекте»: полный краткий перечень возможностей (ИИ-агенты, план развития) и новый источник - Fooocus для баннеров гидов.',
        'About page: a complete short feature list (AI agents, roadmap) and a new source, Fooocus for the guide banners.'
      ),
      item(
        'new',
        'Мапа на /stats: позначки в кожній області - логотип найпопулярнішої марки, моделі, прапор країни походження, частка пального або електромобілів; режим обирається зі списку.',
        'Карта на /stats: отметки в каждой области - логотип самой популярной марки, модели, флаг страны происхождения, доля топлива или электромобилей; режим выбирается из списка.',
        'Map on /stats: a marker in each region showing the top brand logo, model, origin-country flag, fuel share or EV share; pick the mode from a list.'
      ),
      item(
        'new',
        'Кнопка «Зберегти як картинку» на картці номера: готова картка з номером, логотипом, прапором регіону та рейтингом для месенджерів.',
        'Кнопка «Сохранить как картинку» на карточке номера: готовая карточка с номером, логотипом, флагом региона и рейтингом для мессенджеров.',
        'A “Save as picture” button on the plate card: a ready-made image with the plate, logo, region flag and ranking line to share.'
      ),
      item(
        'improved',
        'Картка-превʼю посилання тепер із прапором регіону та написом carsua.app.',
        'Карточка-превью ссылки теперь с флагом региона и надписью carsua.app.',
        'Link-preview cards now show the region flag and carsua.app.'
      ),
      item(
        'improved',
        'Для ШІ-агентів і пошуковиків: файл llms.txt, маніфест ARD та публічний опис API (OpenAPI) лише зі стабільними відкритими розділами.',
        'Для ИИ-агентов и поисковиков: файл llms.txt, манифест ARD и публичное описание API (OpenAPI) только со стабильными открытыми разделами.',
        'For AI agents and search engines: an llms.txt file, an ARD manifest and a public API description (OpenAPI) listing only the stable public sections.'
      ),
      item(
        'improved',
        'Гіди розділу «Довідники» отримали нові ілюстрації-банери.',
        'Гиды раздела «Справочники» получили новые иллюстрации-баннеры.',
        'The /read guides have new banner pictures.'
      ),
      item(
        'fix',
        'Пошук за фото знову знаходить номер на дрібних кадрах: якщо нічого не знайдено, кадр збільшується й розпізнається ще раз.',
        'Поиск по фото снова находит номер на мелких кадрах: если ничего не найдено, кадр увеличивается и распознаётся ещё раз.',
        'Photo search finds plates in small frames again: when nothing is detected, the frame is upscaled and read once more.'
      ),
      item(
        'fix',
        'Віджет перевірки «я не робот» тепер вміщається у вікні входу, а підказка про помилковий запит згадує формат VIN.',
        'Виджет проверки «я не робот» теперь помещается в окне входа, а подсказка об ошибочном запросе упоминает формат VIN.',
        'The “I am not a robot” check fits inside the sign-in popover, and the invalid-query hint now mentions the VIN format.'
      ),
      item(
        'improved',
        'Гід «Імпорт»: історія ввезення авто у світі й в Україні (1997-2024), чому люди купують авто за кордоном, митна картина 2023 року (країни, митниці), пошук ввезеного авто в застосунку та список джерел.',
        'Гид «Импорт»: история ввоза авто в мире и в Украине (1997-2024), почему люди покупают авто за границей, таможенная картина 2023 года (страны, таможни), поиск ввезённого авто в приложении и список источников.',
        'Imports guide: the history of importing cars in the world and in Ukraine (1997-2024), why people buy cars abroad, the 2023 customs picture (countries, offices), how to check an imported car in the app and a list of sources.'
      ),
      item(
        'improved',
        'Гід «Автопарк»: у розділі пального - тенденції та історія видів пального, типи гібридів і зарядних роз’ємів, стандарти якості EN 228/EN 590, перехід на бензин E10 з 1 липня 2026, маркування колонок ЄС, класи Euro; у розділах із законами - посилання на першоджерела.',
        'Гид «Автопарк»: в разделе топлива - тенденции и история видов топлива, типы гибридов и зарядных разъёмов, стандарты качества EN 228/EN 590, переход на бензин E10 с 1 июля 2026, маркировка колонок ЕС, классы Euro; в разделах с законами - ссылки на первоисточники.',
        'Fleet guide: the fuel section now covers fuel trends and history, hybrid types and charging connectors, the EN 228/EN 590 quality standards, the switch to E10 petrol on 1 July 2026, EU pump labels and Euro classes; sections that cite laws now link to the sources.'
      ),
      item(
        'improved',
        'Гід «Автопарк»: у розділі кольорів - 11 кольорів реєстру, коли зміна відтінку потребує перереєстрації, комбіновані кольори й «хамелеон», плівка поверх кольору (повна й часткова), вініл проти антигравійної плівки, строки й штрафи.',
        'Гид «Автопарк»: в разделе цветов - 11 цветов реестра, когда смена оттенка требует перерегистрации, комбинированные цвета и «хамелеон», плёнка поверх цвета (полная и частичная), винил против антигравийной плёнки, сроки и штрафы.',
        'Fleet guide: the colours section now covers the registry’s 11 colours, when a shade change needs re-registration, combined colours and "chameleon" paint, a film over the original colour (full and partial), vinyl versus anti-gravel film, deadlines and fines.'
      ),
      item(
        'improved',
        'Гід «VIN»: історія VIN, де шукати номер на авто (скло, стійка, табличка, вибитий номер, наклейки на пластику) з фото, старі й радянські номери, чому VIN не розбирається та як шукати за VIN у застосунку; у розборі є готові приклади помилкових VIN.',
        'Гид «VIN»: история VIN, где искать номер на авто (стекло, стойка, табличка, выбитый номер, наклейки на пластике) с фото, старые и советские номера, почему VIN не разбирается и как искать по VIN в приложении; в разборе есть готовые примеры ошибочных VIN.',
        'VIN guide: the history of the VIN, where to find it on a car (windscreen, pillar, plate, stamped number, stickers on plastic) with photos, old and Soviet-era numbers, why a VIN may not decode and how to search by VIN in the app; the breakdown has ready examples of faulty VINs.'
      ),
      item(
        'improved',
        'Гід «Номерні знаки»: старі радянські номери з фото, типи номерних знаків із зразками (електро, жовті, індивідуальні, відомчі), як замовити індивідуальний номер; у перевірці - доступні номерні знаки; нерозпізнаний старий номер у пошуку тепер пояснюється.',
        'Гид «Номерные знаки»: старые советские номера с фото, типы номерных знаков с образцами (электро, жёлтые, индивидуальные, ведомственные), как заказать индивидуальный номер; в проверке - доступные номерные знаки; нераспознанный старый номер в поиске теперь объясняется.',
        'Plates guide: old Soviet-era plates with photos, plate types with samples (electric, yellow, custom, departmental), how to order a custom plate, and an available-plates check under Verification; an old-style plate with no result in search now gets an explanation.'
      ),
      item(
        'improved',
        'Гід «Номерні знаки» доповнено: що означає колір знака, військові, поліцейські, дипломатичні й транзитні номери та історія знаків від 1946 року зі схематичними зразками.',
        'Гид «Номерные знаки» дополнен: что означает цвет знака, военные, полицейские, дипломатические и транзитные номера и история знаков с 1946 года со схематичными образцами.',
        'The Plates guide now explains what a plate’s colour means, covers military, police, diplomatic and transit plates, and tells the history of plates since 1946 with schematic samples.'
      ),
      item(
        'improved',
        'У гіді «Типи кузова» кожна картка має вибір прикладів: оберіть модель і побачте її креслення в масштабі з розмірами, на які можна навести.',
        'В гиде «Типы кузова» у каждой карточки есть выбор примеров: выберите модель и увидите её чертёж в масштабе с размерами, на которые можно навести.',
        'In the Body types guide every card has an example picker: choose a model to see its to-scale drawing with dimensions you can point at.'
      ),
      item(
        'improved',
        'У гідах «Розміри» та «Відкликання й поломки» з’явилась інтерактивність: введіть розміри свого місця, щоб побачити, які моделі туди влізуть, або показ одометра, щоб побачити відсоток відмов і проблемні зони для вашого пробігу.',
        'В гидах «Размеры» и «Отзывы и поломки» появилась интерактивность: введите размеры своего места, чтобы увидеть, какие модели туда впишутся, или показание одометра, чтобы увидеть процент отказов и проблемные зоны для вашего пробега.',
        'The Sizes and Recalls & faults guides are now interactive: type your own parking place to see which models fit, or your odometer to see the fail rate and problem areas for your mileage.'
      ),
      item(
        'new',
        'Розділ «Перевірка» має посилання на перевірку розмитнення авто (Митниця), а в меню «Шрифт» можна обрати системний, e-Ukraine або ZAKON.',
        'Раздел «Проверка» получил ссылку на проверку растаможки авто (Таможня), а в меню «Шрифт» можно выбрать системный, e-Ukraine или ZAKON.',
        'The Verification section has a customs-clearance check link, and the Font menu now offers System, e-Ukraine or ZAKON.'
      ),
      item(
        'improved',
        'На телефоні поради до фото згорнуті до двох рядків із розгортанням, а кнопка «Показати більше» під чипами стала більшою з плавною стрілкою.',
        'На телефоне советы к фото свёрнуты до двух строк с раскрытием, а кнопка «Показать больше» под чипами стала крупнее с плавной стрелкой.',
        'On phones the photo tips collapse to two rows and expand, and the chips “Show more” button is bigger with a smooth chevron.'
      ),
      item(
        'improved',
        'Новини з усіх джерел тепер показуються всіма мовами, а журнал змін на «Що нового» згруповано за місяцями.',
        'Новости из всех источников теперь показываются на всех языках, а журнал изменений в «Что нового» сгруппирован по месяцам.',
        'News from all sources now shows in every language, and the What’s new log is grouped by month.'
      ),
      item(
        'improved',
        'Швидше завантаження: головна сторінка вантажить менше, мова й картка результату підвантажуються наперед, а загальні підсумки кешуються на 5 хвилин.',
        'Быстрее загрузка: главная страница грузит меньше, язык и карточка результата подгружаются заранее, а общие итоги кешируются на 5 минут.',
        'Faster loading: the home page loads less, the language and result card are fetched ahead of time, and the global totals are cached for 5 minutes.'
      ),
      item(
        'improved',
        'Плавніші переходи між вкладками в налаштуваннях, адмінці та розділі можливостей.',
        'Более плавные переходы между вкладками в настройках, админке и разделе возможностей.',
        'Smoother transitions between tabs in settings, admin and features.'
      ),
      item(
        'fix',
        'Нижній колонтитул більше не стрибає під час завантаження сторінки (зокрема /fuel), а текст рівнів CO₂ і безпеки контрастніший.',
        'Нижний колонтитул больше не прыгает при загрузке страницы (в том числе /fuel), а текст уровней CO₂ и безопасности контрастнее.',
        'The footer no longer jumps while a page loads (notably /fuel), and the CO₂ and safety band text has higher contrast.'
      ),
      item(
        'fix',
        'Головна сторінка більше не зсувається під час появи анімованих блоків.',
        'Главная страница больше не сдвигается при появлении анимированных блоков.',
        'The home page no longer shifts when animated blocks appear.'
      )
    ]
  },
  {
    date: '2026-10-28',
    version: 'v2.633',
    items: [
      item(
        'fix',
        'Встановлений застосунок знову відкривається без інтернету: раніше замість сторінки був порожній екран.',
        'Установленное приложение снова открывается без интернета: раньше вместо страницы был пустой экран.',
        'The installed app opens offline again: it used to show a blank screen instead of the page.'
      ),
      item(
        'new',
        'Безпека авто з ЄС: які системи (екстрене гальмування, утримання в смузі, помічник швидкості, контроль сонливості, відволікання водія, гальмування для пішоходів і велосипедистів) були обов’язковими за законом ЄС для року випуску - це правовий мінімум, а не комплектація конкретного авто',
        'Безопасность авто из ЕС: какие системы (экстренное торможение, удержание в полосе, помощник скорости, контроль сонливости, отвлечения водителя, торможение для пешеходов и велосипедистов) были обязательны по закону ЕС для года выпуска - это правовой минимум, а не комплектация конкретного авто',
        'Safety of EU-market cars: which systems (emergency braking, lane keeping, speed assistance, drowsiness and distraction warning, pedestrian and cyclist braking) EU law required for the model year - a legal baseline, not the equipment of this particular car'
      ),
      item(
        'new',
        'Допомога водієві з VIN: адаптивний круїз, утримання в смузі, аварійне гальмування, сліпі зони, рівень автоматизації SAE і покоління апаратної частини Tesla Autopilot - тепер і на картці номера (комплектація для ринку США)',
        'Помощь водителю по VIN: адаптивный круиз, удержание в полосе, аварийное торможение, слепые зоны, уровень автоматизации SAE и поколение аппаратной части Tesla Autopilot - теперь и на карточке номера (комплектация для рынка США)',
        'Driver assists from the VIN: adaptive cruise, lane keeping, emergency braking, blind spots, the SAE automation level and the Tesla Autopilot hardware generation - now on the plate card too (US-market spec)'
      ),
      item(
        'new',
        'Підтримка CarPlay / Android Auto: на картці номера та VIN - посилання на офіційні сторінки Apple і Google, а в «Типових даних моделі» - правовий мінімум безпеки ЄС',
        'Поддержка CarPlay / Android Auto: на карточке номера и VIN - ссылки на официальные страницы Apple и Google, а в «Типовых данных модели» - правовой минимум безопасности ЕС',
        'CarPlay / Android Auto support: links to the official Apple and Google pages on the plate and VIN cards, and the EU legal safety baseline in "Typical model data"'
      ),
      item(
        'data',
        'Сторінка «Про проєкт»: нові джерела - Apple CarPlay / Android Auto і EUR-Lex (Регламент ЄС 2019/2144), оновлено опис VIN-можливостей',
        'Страница «О проекте»: новые источники - Apple CarPlay / Android Auto и EUR-Lex (Регламент ЕС 2019/2144), обновлено описание возможностей VIN',
        'About page: new sources - Apple CarPlay / Android Auto and EUR-Lex (Regulation (EU) 2019/2144), and a fuller VIN feature line'
      ),
      item(
        'new',
        'Гра-гонки: карта дороги (вигляд зверху) з деревами, знаками та іншими авто; вмикається кнопкою «Карта»',
        'Игра-гонки: карта дороги (вид сверху) с деревьями, знаками и другими авто; включается кнопкой «Карта»',
        'Race game: a top-down road map showing the trees, signs and other cars; toggled with the Map button'
      ),
      item(
        'new',
        'Кермо праворуч: позначка RHD на картці VIN, коли декодований VIN це показує',
        'Руль справа: метка RHD на карточке VIN, когда расшифрованный VIN это показывает',
        'Right-hand drive: an RHD chip on the VIN card when the decoded VIN says so'
      ),
      item(
        'new',
        'Гра-гонки: керування нахилом телефона на сенсорних екранах і робота офлайн після першого завантаження',
        'Игра-гонки: управление наклоном телефона на сенсорных экранах и работа офлайн после первой загрузки',
        'Race game: optional tilt steering on touch devices, and it works offline after the first load'
      ),
      item(
        'improved',
        'Переклад на місці працює навіть без вбудованого перекладача браузера: невеликі моделі OPUS кешуються в браузері',
        'Перевод на месте работает даже без встроенного переводчика браузера: небольшие модели OPUS кэшируются в браузере',
        'Translate in place now works without the built-in browser translator: small OPUS models are cached in your browser'
      ),
      item(
        'new',
        'Щомісячні новини на пошту: за бажанням (вмикається в профілі) - раз на місяць короткий список нових можливостей, лише коли вони були; відписка в один клік',
        'Ежемесячные новости на почту: по желанию (включается в профиле) - раз в месяц короткий список новых возможностей, только когда они были; отписка в один клик',
        'Monthly news by email: optional (switched on in your profile) - once a month a short list of new features, only when there were some; one-click unsubscribe'
      ),
      item(
        'new',
        'Базова ціна США з VIN (NHTSA): перевірка поруч із ціною ЄС, а для авто без ціни ЄС - власна оцінка з розмитненням',
        'Базовая цена США по VIN (NHTSA): проверка рядом с ценой ЕС, а для авто без цены ЕС - собственная оценка с растаможкой',
        'US base price from the VIN (NHTSA): a cross-check next to the EU price, and its own estimate with customs for cars without an EU price'
      ),
      item(
        'improved',
        'Новини Yahoo Finance перенесено з «Соцмереж» до «Новин»: дві підписані групи, разом не більше 5 новин',
        'Новости Yahoo Finance перенесены из «Соцсетей» в «Новости»: две подписанные группы, всего не больше 5 новостей',
        'Yahoo Finance headlines moved from Social to News: two labelled groups, at most 5 headlines in total'
      ),
      item(
        'new',
        'Бічне меню: тема «Авто» (за системою), колір акценту та розмір тексту',
        'Боковое меню: тема «Авто» (как в системе), цвет акцента и размер текста',
        'Sidebar: an "Auto" theme (follows the system), an accent color and a text size'
      ),
      item(
        'new',
        'Кнопка «Поділитися» також внизу сторінки результату за номером або VIN',
        'Кнопка «Поделиться» также внизу страницы результата по номеру или VIN',
        'A Share button also at the bottom of a plate or VIN result page'
      ),
      item(
        'improved',
        'Посилання для поширення містять номер латиницею замість закодованої кирилиці',
        'Ссылки для отправки содержат номер латиницей вместо закодированной кириллицы',
        'Share links carry the plate in Latin letters instead of percent-encoded Cyrillic'
      ),
      item(
        'improved',
        'PDF і Word з «Копіювати всю інформацію» мають зміст і окрему сторінку для кожного розділу',
        'PDF и Word из «Копировать всю информацию» имеют оглавление и отдельную страницу для каждого раздела',
        'The PDF and Word from "Copy all info" have a contents page and a page per section'
      ),
      item(
        'data',
        'На сторінці «Про проєкт» додано Disqus у джерелах і вигляд застосунку у можливостях',
        'На странице «О проекте» добавлены Disqus в источники и внешний вид приложения в возможности',
        'The About page now lists Disqus among its sources and app appearance among the features'
      ),
      item(
        'data',
        'Сторінка «Про проєкт»: повний перелік можливостей між описом і джерелами, додано переклад на місці, базову ціну США та карту дороги',
        'Страница «О проекте»: полный перечень возможностей между описанием и источниками, добавлены перевод на месте, базовая цена США и карта дороги',
        'About page: the full feature list sits between the description and the sources, now with in-place translation, the US base price and the road map'
      ),
      item(
        'improved',
        'Встановлений застосунок більше не блимає синім під час запуску',
        'Установленное приложение больше не мигает синим при запуске',
        'The installed app no longer flashes blue on launch'
      )
    ]
  },
  {
    date: '2026-10-27',
    version: 'v2.565',
    items: [
      item(
        'fix',
        'Пошук за фото: повільне розпізнавання більше не завершується помилкою, його можна пропустити',
        'Поиск по фото: медленное распознавание больше не завершается ошибкой, его можно пропустить',
        'Photo search: slow recognition no longer fails, and you can skip it'
      ),
      item(
        'data',
        'На сторінці «Про проєкт» додано Cloudflare (CDN і кеш) у джерелах, а також обговорення та посилання з картками-превʼю у можливостях',
        'На странице «О проекте» добавлены Cloudflare (CDN и кеш) в источники, а также обсуждение и ссылки с карточками-превью в возможности',
        'The About page now lists Cloudflare (CDN and cache) among its sources, plus discussion and link-preview sharing among the features'
      ),
      item(
        'improved',
        'PDF і Word з «Копіювати всю інформацію» стали гарнішими: кольорова плашка розшуку, шлях походження кроками, таблиці з заголовком і зеброю та смуга-підсумок на початку',
        'PDF и Word из «Копировать всю информацию» стали аккуратнее: цветная плашка розыска, путь происхождения шагами, таблицы с заголовком и зеброй и полоса-итог в начале',
        'The PDF and Word from "Copy all info" look better: a coloured wanted banner, the origin as steps, tables with a shaded header and zebra rows, and a summary strip on the cover'
      ),
      item(
        'improved',
        '«Копіювати всю інформацію» тепер містить «Звідки авто» та перевірку розшуку (з історією записів) і відповідні джерела',
        '«Копировать всю информацию» теперь включает «Откуда авто» и проверку розыска (с историей записей) и соответствующие источники',
        '"Copy all info" now includes "Where it comes from" and the wanted check (with record history), plus their sources'
      ),
      item(
        'new',
        'Дзвінок у шапці: крапка, коли є нові оновлення, і список останніх змін зі посиланням на «Що нового»',
        'Колокольчик в шапке: точка, когда есть новые обновления, и список последних изменений со ссылкой на «Что нового»',
        'A bell in the header: a dot when there are new updates, with a dropdown of the latest changes linking to What’s new'
      ),
      item(
        'new',
        'Новини: показано, коли їх востаннє оновлено, - на сторінці /news та в розділі новин картки авто; на /wanted - дату оновлення списку поліції',
        'Новости: показано, когда они обновлялись в последний раз, - на странице /news и в разделе новостей карточки авто; на /wanted - дата обновления списка полиции',
        'News: shows when it was last updated - on /news and in the result card News section; /wanted shows the police list refresh date'
      ),
      item(
        'improved',
        'Панель шарів фону та дзвінок оновлень показують скелетон, поки завантажуються',
        'Панель слоёв фона и колокольчик обновлений показывают скелетон, пока загружаются',
        'The background-layers panel and the updates bell show a skeleton while they load'
      ),
      item(
        'improved',
        'Бічні віджети новин показують новини всіма мовами, а не лише мовою інтерфейсу',
        'Боковые виджеты новостей показывают новости на всех языках, а не только на языке интерфейса',
        'The side news widgets show news in all languages, not only the interface language'
      ),
      item(
        'improved',
        'Посилання для поширення зберігають обраний шрифт',
        'Ссылки для отправки сохраняют выбранный шрифт',
        'Share links carry the chosen font'
      ),
      item(
        'fix',
        'Картки для соцмереж (/og/) більше не бувають без тексту: шрифти підбираються на льоту',
        'Карточки для соцсетей (/og/) больше не бывают без текста: шрифты подбираются на лету',
        'Link-preview cards (/og/) no longer come out without text: fonts are resolved on demand'
      )
    ]
  },
  {
    date: '2026-10-26',
    version: 'v2.525',
    items: [
      item(
        'improved',
        'Пошук за фото: якщо символ на номері важко розібрати, показано кілька можливих варіантів цього номера, пов’язаних ланцюжком; кожен номер на фото має свій колір і цифру',
        'Поиск по фото: если символ на номере трудно разобрать, показано несколько возможных вариантов этого номера, связанных цепочкой; у каждого номера на фото свой цвет и цифра',
        'Photo search: when a character on a plate is hard to read, several possible readings of that plate are shown chained together; each plate in the photo has its own color and number'
      ),
      item(
        'fix',
        'Пошук за фото: розпізнавання триряндних номерів мопедів і мотоциклів та точніші літери й цифри (літера U більше не підставляється замість O)',
        'Поиск по фото: распознавание трёхрядных номеров мопедов и мотоциклов и более точные буквы и цифры (буква U больше не подставляется вместо O)',
        'Photo search: reads three-row moped and motorcycle plates, with more accurate letters and digits (a U is no longer picked where an O belongs)'
      ),
      item(
        'new',
        'У секції «Звідки авто» для популярних моделей показано, де ще їх збирають (країна, місто, роки)',
        'В секции «Откуда авто» для популярных моделей показано, где ещё их собирают (страна, город, годы)',
        'The origin section now lists where else popular models were built (country, city, years)'
      ),
      item(
        'data',
        'На сторінці «Про проєкт» у джерелах додано відкриті моделі розпізнавання номерів (fast-alpr, RapidOCR)',
        'На странице «О проекте» в источниках добавлены открытые модели распознавания номеров (fast-alpr, RapidOCR)',
        'The About page now credits the open plate-recognition models (fast-alpr, RapidOCR) among its sources'
      ),
      item(
        'data',
        'Заводи збирання моделей зібрані вручну з Вікіпедії - з посиланням на статтю для кожного запису',
        'Заводы сборки моделей собраны вручную из Википедии - со ссылкой на статью для каждой записи',
        'Model assembly plants are hand-curated from Wikipedia, with an article link for every entry'
      ),
      item(
        'new',
        'Статистика: «Звідки авто» - легкові авто за країною бренду та за країною збирання (за VIN), з колишніми країнами за модельним роком',
        'Статистика: «Откуда авто» - легковые авто по стране бренда и по стране сборки (по VIN), с прежними странами по модельному году',
        'Stats: "Where cars come from" - passenger cars by brand home country and by assembly country (from the VIN), with the country of their time by model year'
      ),
      item(
        'new',
        'Звідки авто: прапорці біля VIN і номера (країна марки, власника, збирання) та секція з часовою лінією — марка, власники, завод, Україна',
        'Откуда авто: флажки рядом с VIN и номером (страна марки, владельца, сборки) и секция с временной линией — марка, владельцы, завод, Украина',
        'Where it comes from: flags next to the VIN and plate (brand, owner, assembly country) and a timeline section - brand, owners, plant, Ukraine'
      ),
      item(
        'new',
        'Для старих авто показуємо колишні країни: СРСР, Чехословаччина, НДР, ФРН, Югославія',
        'Для старых авто показываем прежние страны: СССР, Чехословакия, ГДР, ФРГ, Югославия',
        'Older cars show the country of their time: USSR, Czechoslovakia, East and West Germany, Yugoslavia'
      ),
      item(
        'improved',
        'Перед переходом на перевірку AUTO.RIA номер або VIN копіюється - залишається лише вставити його на сайті',
        'Перед переходом на проверку AUTO.RIA номер или VIN копируется - остаётся только вставить его на сайте',
        'Before opening the AUTO.RIA check the plate or VIN is copied - just paste it on the site'
      ),
      item(
        'data',
        'Країни, штаб-квартири та власники марок із Wikidata, виробники VIN (WMI) з NHTSA; прибрано помилкових власників у популярних марок',
        'Страны, штаб-квартиры и владельцы марок из Wikidata, производители VIN (WMI) из NHTSA; убраны ошибочные владельцы у популярных марок',
        'Brand countries, headquarters and owners from Wikidata, VIN manufacturers (WMI) from NHTSA; wrong owners of popular brands cleaned up'
      ),
      item(
        'fix',
        'Міста заводів з NHTSA пишуться як «Georgetown», а не «GEORGETOWN»',
        'Города заводов из NHTSA пишутся как «Georgetown», а не «GEORGETOWN»',
        'NHTSA plant cities read “Georgetown”, not “GEORGETOWN”'
      )
    ]
  },
  {
    date: '2026-10-25',
    version: 'v2.503',
    items: [
      item(
        'new',
        'Якщо номера чи VIN немає в реєстрі (наприклад, авто до 2013 року), під повідомленням з’явилося посилання на перевірку AUTO.RIA',
        'Если номера или VIN нет в реестре (например, авто до 2013 года), под сообщением появилась ссылка на проверку AUTO.RIA',
        'When a plate or VIN is not in the registry (e.g. a pre-2013 car), a link to the AUTO.RIA check now appears under the message'
      ),
      item(
        'new',
        'У секції «Перевірка» нові посилання: протокол техогляду (ОТК) за номером і чинність посвідчення водія',
        'В секции «Проверка» новые ссылки: протокол техосмотра (ОТК) по номеру и действительность водительского удостоверения',
        'Verification section has new links: technical inspection protocol (OTK) by plate and driving licence validity'
      ),
      item(
        'new',
        'Прапори областей: на картці номера біля регіону, у поясненні номера та на рекламних щитах у тест-драйві',
        'Флаги областей: на карточке номера рядом с регионом, в пояснении номера и на рекламных щитах в тест-драйве',
        'Region flags: on the plate card next to the region, in the plate explanation and on the test-drive billboards'
      ),
      item(
        'new',
        'Тест-драйв завершується після 10 км: щоб їхати далі, звертайтеся до справжнього продавця',
        'Тест-драйв завершается после 10 км: чтобы ехать дальше, обращайтесь к настоящему продавцу',
        'The test drive ends after 10 km: to go further, contact a real seller'
      ),
      item(
        'improved',
        'У тест-драйві вибір фону області змінює й область на рекламних щитах; новий фон для Миколаївської області',
        'В тест-драйве выбор фона области меняет и область на рекламных щитах; новый фон для Николаевской области',
        'In the test drive, picking a region backdrop also sets the billboard region; new Mykolaiv backdrop'
      ),
      item(
        'new',
        'У тест-драйві фото-фони для кожної області: номер стартує на фоні своєї області, а в налаштуваннях є розділ «Фони областей»',
        'В тест-драйве фото-фоны для каждой области: номер стартует на фоне своей области, а в настройках есть раздел «Фоны областей»',
        'The test drive has a photo backdrop for every region: a plate starts on its own region, and the settings have a “Region backdrops” section'
      ),
      item(
        'new',
        'У тест-драйві зіткнення спричиняють дим (білий, сірий, чорний), а після 20 зіткнень авто розбивається',
        'В тест-драйве столкновения вызывают дым (белый, серый, чёрный), а после 20 столкновений авто разбивается',
        'In the test drive bumps cause smoke (white, grey, black) and the car is wrecked after 20 bumps'
      ),
      item(
        'new',
        'Біля області на картці номера є «?» - великий прапор області; прапори також у виборі області в тест-драйві',
        'Рядом с областью на карточке номера есть «?» - большой флаг области; флаги также в выборе области в тест-драйве',
        'A “?” beside the region on the plate card shows a large region flag; flags also appear in the test-drive region picker'
      ),
      item(
        'improved',
        'У «Перевірці» біля кожного рядка є «?» з розшифровкою скорочень (БДР, ПДР, ОСЦПВ, МТСБУ, ОТК, ТСЦ МВС)',
        'В «Проверке» у каждой строки есть «?» с расшифровкой сокращений (БДР, ПДР, ОСЦПВ, МТСБУ, ОТК, ТСЦ МВД)',
        'Each Verification row has a “?” spelling out the abbreviations (BDR, PDR, OSCPV, MTSBU, OTK, TSC MVS)'
      ),
      item(
        'improved',
        'У підказках чипів рейтингу першим рядком - значення й кількість авто (марка, модель, колір, область)',
        'В подсказках чипов рейтинга первой строкой - значение и количество авто (марка, модель, цвет, область)',
        'Ranking chip tooltips lead with the ranked value and its vehicle count (make, model, colour, region)'
      ),
      item(
        'fix',
        'Оновлено джерело оглядів Carscoops у стрічці новин',
        'Обновлён источник обзоров Carscoops в ленте новостей',
        'Repointed the Carscoops reviews feed in the news ticker'
      )
    ]
  },
  {
    date: '2026-10-17',
    version: 'v2.494',
    items: [
      item(
        'new',
        'Сторінка /wanted: статистика авто в розшуку за роками, областями, марками, моделями, типами та кольорами, з історією знайдених авто з серпня 2020, мапою та списками нещодавно викрадених і знайдених; короткий блок на головній',
        'Страница /wanted: статистика разыскиваемых авто по годам, областям, маркам, моделям, типам и цветам, с историей найденных авто с августа 2020, картой и списками недавно угнанных и найденных; краткий блок на главной',
        'New /wanted page: statistics of vehicles wanted for theft by year, region, make, model, type and colour, with the history of found cars since Aug 2020, a map and lists of recently stolen and found vehicles; a short teaser on the home page'
      ),
      item(
        'improved',
        'Секція «Розшук» на картці авто тепер показує знайдені раніше записи з історії stolen.in.ua та посилається на статистику',
        'Секция «Розыск» на карточке авто теперь показывает найденные ранее записи из истории stolen.in.ua и ссылается на статистику',
        'The Wanted section on the car card now shows earlier found records from the stolen.in.ua history and links to the statistics'
      ),
      item(
        'improved',
        '«Про проєкт»: опис розшуку доповнено статистикою /wanted, а stolen.in.ua - історією знайдених авто; у бічному меню з’явилося посилання на /wanted',
        '«О проекте»: описание розыска дополнено статистикой /wanted, а stolen.in.ua - историей найденных авто; в боковом меню появилась ссылка на /wanted',
        'About: the wanted description now mentions the /wanted statistics and stolen.in.ua the found-vehicle history; the sidebar links to /wanted'
      )
    ]
  },
  {
    date: '2026-10-16',
    version: 'v2.469',
    items: [
      item(
        'improved',
        '«Копіювати всю інформацію» тепер містить новини, соціальні обговорення (Bluesky, Stack Exchange, Lemmy), фінансові новини компанії та список джерел даних',
        '«Копировать всю информацию» теперь включает новости, социальные обсуждения (Bluesky, Stack Exchange, Lemmy), финансовые новости компании и список источников данных',
        '“Copy all info” now includes news, social threads (Bluesky, Stack Exchange, Lemmy), the company’s finance news and a list of the data sources used'
      ),
      item(
        'improved',
        'Схема мас на картці авто співвідносить обране авто з GVM, TBM, GTM, ATM і GCM; секції акцизу та мас відкриті за замовчуванням',
        'Схема масс на карточке авто соотносит выбранное авто с GVM, TBM, GTM, ATM и GCM; секции акциза и масс открыты по умолчанию',
        'The mass schema on the car card now relates the chosen car to GVM, TBM, GTM, ATM and GCM; the excise and mass sections are open by default'
      ),
      item(
        'improved',
        'Статті /read оформлені як блог: обкладинка, дата та кнопка копіювання посилання; у «Про проєкт» з’явився пункт про довідники',
        'Статьи /read оформлены как блог: обложка, дата и кнопка копирования ссылки; в «О проекте» появился пункт о справочниках',
        'The /read guides look like blog posts: cover banner, date and copy-link button; About now lists the guides'
      ),
      item(
        'improved',
        'Секції картки авто та сторінки VIN тепер мають кнопку «Довідник» зі стрілкою - перехід до відповідного пояснення в /read (колір, VIN, розміри, паливо, безпека, відкликання та інше)',
        'Секции карточки авто и страницы VIN теперь имеют кнопку «Справочник» со стрелкой - переход к соответствующему объяснению в /read (цвет, VIN, размеры, топливо, безопасность, отзывы и другое)',
        'Car card and VIN page sections now end with a “Guide” button with an arrow - a link to the matching explainer in /read (colour, VIN, size, fuel, safety, recalls and more)'
      ),
      item(
        'new',
        'Довідник /read/recalls: чим відкликання відрізняється від типової несправності, кампанії ЄС, США й Канади та частка відмов за пробігом у британському техогляді - на прикладі популярних моделей',
        'Справочник /read/recalls: чем отзыв отличается от типичной неисправности, кампании ЕС, США и Канады и доля отказов по пробегу в британском техосмотре - на примере популярных моделей',
        'New /read/recalls guide: how a recall differs from a common fault, EU, US and Canadian campaigns and the fail rate by mileage in UK inspections - shown on popular models'
      ),
      item(
        'new',
        'Довідник /read/vin: з чого складається VIN, розбір будь-якого введеного VIN (виробник, країна, модельний рік, контрольна цифра), таблиця кодів року та де знайти VIN',
        'Справочник /read/vin: из чего состоит VIN, разбор любого введённого VIN (производитель, страна, модельный год, контрольная цифра), таблица кодов года и где найти VIN',
        'New /read/vin guide: what a VIN is made of, a breakdown of any VIN you type (maker, country, model year, check digit), the year-code table and where to find the VIN'
      ),
      item(
        'new',
        'Довідник /read: типи кузова і розміри авто простими словами - з реальними моделями з реєстру, номерами та пошуком за розміром; на картці авто є посилання на відповідні пояснення',
        'Справочник /read: типы кузова и размеры авто простыми словами - с реальными моделями из реестра, номерами и поиском по размеру; на карточке авто есть ссылки на соответствующие объяснения',
        'New /read guides: body types and car sizes explained with real models from the registry, real plates and a size explorer; the plate card links to the matching explanations'
      ),
      item(
        'new',
        'Довідник /read/fleet: що їздить Україною - найпопулярніші кольори, паливо та роки реєстрації авто',
        'Справочник /read/fleet: что ездит по Украине - самые популярные цвета, топливо и годы регистрации авто',
        'New /read/fleet guide: what Ukraine drives - the most common colours, fuels and registration years'
      ),
      item(
        'new',
        'Довідник /read/plates: будова номерного знака, усі коди регіонів (чинні й старі цифрові), перевірка вашого номера та номери без регіону (Дія, Кабінет водія)',
        'Справочник /read/plates: устройство номерного знака, все коды регионов (действующие и старые цифровые), проверка вашего номера и номера без региона (Дія, Кабинет водителя)',
        'New /read/plates guide: plate anatomy, every region code (current and legacy digit codes), a check for your own plate and plates without a region (Diia, Driver’s Cabinet)'
      ),
      item(
        'new',
        'Довідник /read/generations: як Octavia, Golf, Camry та інші моделі росли за поколіннями - довжина, ширина й колісна база кожного покоління',
        'Справочник /read/generations: как Octavia, Golf, Camry и другие модели росли по поколениям - длина, ширина и колёсная база каждого поколения',
        'New /read/generations guide: how the Octavia, Golf, Camry and other models grew across generations - length, width and wheelbase of every generation'
      ),
      item(
        'new',
        'Довідник /read/electric: електромобілі в Україні - за роком випуску, регіонами та моделями, плюс гід по роз’ємах зарядки (Type 2, CCS, CHAdeMO, GB/T)',
        'Справочник /read/electric: электромобили в Украине - по году выпуска, регионам и моделям, плюс гид по разъёмам зарядки (Type 2, CCS, CHAdeMO, GB/T)',
        'New /read/electric guide: electric cars in Ukraine by model year, region and model, plus a charging-plug guide (Type 2, CCS, CHAdeMO, GB/T)'
      ),
      item(
        'new',
        'Довідник /read/imports: авто з-за кордону - ввезені та куплені через дилера за роками, найчастіші моделі, країна збирання за VIN і що перевірити перед купівлею',
        'Справочник /read/imports: авто из-за границы - ввезённые и купленные через дилера по годам, самые частые модели, страна сборки по VIN и что проверить перед покупкой',
        'New /read/imports guide: cars from abroad - imported vs dealer-bought by year, the most imported models, country of build by VIN and what to check before buying'
      ),
      item(
        'new',
        'Довідник /read/safety: краш-тести - п’ять програм (Euro NCAP, IIHS, JNCAP, C-NCAP, KNCAP), оцінки автопарку, зміна за роками випуску, найкращі й найслабші моделі та межі цих оцінок',
        'Справочник /read/safety: краш-тесты - пять программ (Euro NCAP, IIHS, JNCAP, C-NCAP, KNCAP), оценки автопарка, изменение по годам выпуска, лучшие и слабейшие модели и пределы этих оценок',
        'New /read/safety guide: crash tests - the five programmes (Euro NCAP, IIHS, JNCAP, C-NCAP, KNCAP), the fleet’s ratings, change by model year, the best and weakest models and the limits of these ratings'
      ),
      item(
        'new',
        'Довідник /read/fuel: паливо й викиди CO₂ - на чому їздить парк, розподіл викидів, зміна за роками випуску, найчистіші та найвитратніші моделі і як ми оцінюємо викиди',
        'Справочник /read/fuel: топливо и выбросы CO₂ - на чём ездит парк, распределение выбросов, изменение по годам выпуска, самые чистые и самые затратные модели и как мы оцениваем выбросы',
        'New /read/fuel guide: fuel and CO₂ - what the fleet runs on, the spread of emissions, change by model year, the cleanest and most CO₂-heavy models and how we estimate emissions'
      ),
      item(
        'new',
        'Довідник /read/extremes: найважчі й найлегші моделі за групами транспорту, найпотужніші, з найбільшим двигуном, найвищі, найдовші та з найбільшим баком - і як читати ці рейтинги',
        'Справочник /read/extremes: самые тяжёлые и лёгкие модели по группам транспорта, самые мощные, с самым большим двигателем, самые высокие, длинные и с самым большим баком - и как читать эти рейтинги',
        'New /read/extremes guide: the heaviest and lightest models by vehicle group, the most powerful, biggest-engined, tallest, longest and largest-tanked - and how to read these rankings'
      )
    ]
  },
  {
    date: '2026-10-15',
    version: 'v2.440',
    items: [
      item(
        'new',
        'Посилання на Нові Офіційні Тести ПДР (pdr.infotech.gov.ua) у секції «Перевірка» та у вікні тест-драйву',
        'Ссылка на Новые официальные тесты ПДД (pdr.infotech.gov.ua) в секции «Проверка» и в окне тест-драйва',
        'Link to the new official traffic-rules tests (pdr.infotech.gov.ua) in the Verification section and the test-drive window'
      ),
      item(
        'new',
        'Фільтр за призначенням у розширеному пошуку, пояснення призначення й власника на картці; колір веде до статистики /stats',
        'Фильтр по назначению в расширенном поиске, пояснения назначения и владельца на карточке; цвет ведёт к статистике /stats',
        'Purpose filter in advanced search, purpose and owner explainers on the card; the colour row links to /stats'
      ),
      item(
        'new',
        'Гарнітура e-Ukraine як додатковий шрифт у меню',
        'Гарнитура e-Ukraine как дополнительный шрифт в меню',
        'e-Ukraine typeface as an optional font in the menu'
      ),
      item(
        'new',
        'Динаміка: к.с. на тонну, орієнтовний розгін 0–100, максимальна швидкість поруч із гепардом і лімітами України, потужність у конях',
        'Динамика: л. с. на тонну, ориентировочный разгон 0–100, максимальная скорость рядом с гепардом и лимитами Украины, мощность в лошадях',
        'Performance: hp per tonne, estimated 0–100, top speed next to a cheetah and the Ukrainian limits, power in horses'
      ),
      item(
        'new',
        'Місце авто серед легковиків України за потужністю, к.с. на тонну та об’ємом; орієнтовний акциз при ввезенні; схема мас GVM/TBM/GTM/ATM/GCM',
        'Место авто среди легковых Украины по мощности, л. с. на тонну и объёму; ориентировочный акциз при ввозе; схема масс GVM/TBM/GTM/ATM/GCM',
        'Where a car ranks among Ukrainian passenger cars by power, hp per tonne and engine size; import excise estimate; GVM/TBM/GTM/ATM/GCM mass schema'
      ),
      item(
        'new',
        'Маса та буксирування: корисне навантаження з повзунками людей і багажу, чи підійде причіп/караван, потрібна категорія прав',
        'Масса и буксировка: полезная нагрузка с ползунками людей и багажа, подойдёт ли прицеп/караван, нужная категория прав',
        'Mass and towing: payload with people and luggage sliders, which trailer or caravan fits, the licence category needed'
      ),
      item(
        'fix',
        'Кнопка «Поділитися» тепер завжди видима на сторінці /relax, зокрема на фоні «Фото»',
        'Кнопка «Поделиться» теперь всегда видна на странице /relax, в том числе на фоне «Фото»',
        'Share button is now always shown on the /relax page, including on the Photos background'
      ),
      item(
        'improved',
        '«Про застосунок»: короткий список усіх можливостей і нові джерела (Нацполіція, МВС, МТСБУ, DRIVE2 тощо)',
        '«О приложении»: краткий список всех возможностей и новые источники (Нацполиция, МВД, МТСБУ, DRIVE2 и др.)',
        'About: brief list of all features and new sources (National Police, MVS, MTSBU, DRIVE2, etc.)'
      ),
      item(
        'new',
        'Перевірка розшуку (викрадення) за номером і VIN',
        'Проверка розыска (угона) по номеру и VIN',
        'Wanted (stolen) vehicle check by plate and VIN'
      ),
      item(
        'improved',
        'Перехресні посилання між секціями картки та стрілки-чипи для переходу між рядками',
        'Перекрёстные ссылки между секциями карточки и стрелки-чипы для перехода между строками',
        'Cross-links between result-card sections and chip-style row jump arrows'
      )
    ]
  },
  {
    date: '2026-10-14',
    version: 'v2.420',
    items: [
      item(
        'new',
        'Секція «Габарити та паркування» і чип класу розміру',
        'Секция «Габариты и парковка» и чип класса размера',
        'New “Size & parking” section and size-class chip'
      ),
      item(
        'improved',
        'Пояснення «?» на чипах, вкладки ваги в URL, габарити лише в метрах',
        'Пояснения «?» на чипах, вкладки веса в URL, габариты только в метрах',
        '“?” explainers on chips, weight tabs in the URL, sizes in metres only'
      ),
      item(
        'improved',
        'Мобільна версія: щипок-масштаб, свайп фото, позначки ↗ для зовнішніх посилань',
        'Мобильная версия: масштаб щипком, свайп фото, пометки ↗ для внешних ссылок',
        'Mobile polish: pinch zoom, photo swipe, ↗ markers on external links'
      ),
      item(
        'improved',
        'Пояснення, що VIN у реєстрі є лише з 2021 року; аукціонні джерела на «Про застосунок»',
        'Пояснение, что VIN в реестре есть только с 2021 года; аукционные источники в «О приложении»',
        'Note that registry VINs start in 2021; auction sources listed on About'
      )
    ]
  },
  {
    date: '2026-10-13',
    version: 'v2.412',
    items: [
      item(
        'new',
        'Вхід через Telegram і через email-посилання без пароля; сторінка /profile',
        'Вход через Telegram и по email-ссылке без пароля; страница /profile',
        'Telegram and passwordless email sign-in; /profile page'
      ),
      item(
        'new',
        'Сторінка /install з інструкцією з встановлення та кнопкою',
        'Страница /install с инструкцией по установке и кнопкой',
        '/install page with a PWA guide and install button'
      ),
      item(
        'new',
        'Історія аукціонів з перевіркою за VIN, чип «Ввезено» та історія/власники за VIN через попередні номери',
        'История аукционов с проверкой по VIN, чип «Ввезён» и история/владельцы по VIN через прежние номера',
        'Auction history by VIN, “Was imported” chip, VIN-based history and owners across earlier plates'
      ),
      item(
        'new',
        'Віджет новин Yahoo Finance; позначка застарілих коротких VIN',
        'Виджет новостей Yahoo Finance; пометка устаревших коротких VIN',
        'Yahoo Finance news widget; legacy short VINs are flagged'
      ),
      item(
        'improved',
        'Адаптивне керування тест-драйвом; кнопки шарів і профілю в мобільному меню',
        'Адаптивное управление тест-драйвом; кнопки слоёв и профиля в мобильном меню',
        'Responsive test-drive controls; layers and profile buttons in the mobile menu'
      ),
      item(
        'data',
        'Нові псевдоніми фото для радянських вантажівок, Газелей, MAN та фургонів Mercedes',
        'Новые алиасы фото для советских грузовиков, Газелей, MAN и фургонов Mercedes',
        'New photo aliases for Soviet trucks, Gazelles, MAN and Mercedes vans'
      ),
      item(
        'fix',
        'Оновлення вразливих залежностей, захищена статика, локальні dev-порти',
        'Обновлены уязвимые зависимости, защищена статика, локальные dev-порты',
        'Vulnerable dependencies patched, static serving hardened, dev ports bound locally'
      )
    ]
  },
  {
    date: '2026-10-12',
    version: 'v2.377',
    items: [
      item(
        'new',
        'Сортування результатів розширеного пошуку; посилання на відгуки та ідеї → /discuss',
        'Сортировка результатов расширенного поиска; ссылки на отзывы и идеи → /discuss',
        'Sortable advanced-search results; feedback links to /discuss'
      ),
      item(
        'new',
        'Нові моделі поліції, швидкої, пожежної та таксі, сирена й сигнал у гонках',
        'Новые модели полиции, скорой, пожарной и такси, сирена и сигнал в гонках',
        'New police, ambulance, fire and taxi models, siren and horn in the racer'
      ),
      item(
        'new',
        'Перекладні посилання для вікі-тексту та причин MOT; sitemap і ліміти запитів до API',
        'Ссылки «Перевести» для вики-текста и причин MOT; sitemap и лимиты запросов к API',
        'Translate links for wiki text and MOT reasons; sitemap and API rate limits'
      ),
      item(
        'data',
        'MOT 2024–2025 об’єднано з попередніми роками (2021–25)',
        'MOT 2024–2025 объединён с предыдущими годами (2021–25)',
        'MOT 2024–2025 pooled with earlier years (2021–25)'
      ),
      item(
        'data',
        'Покоління та вікі-характеристики ще для ~45 мотоциклів, автобусів і радянських вантажівок',
        'Поколения и вики-характеристики ещё для ~45 мотоциклов, автобусов и советских грузовиков',
        'Generations and wiki specs for ~45 more motorcycles, buses and Soviet trucks'
      ),
      item(
        'fix',
        'Припинено показ сторонніх зображень краш-тестів; кращий розбір кодів двигуна й шасі',
        'Прекращён показ сторонних изображений краш-тестов; лучше разбор кодов двигателя и шасси',
        'Third-party crash-test images no longer served; better engine/chassis code parsing'
      )
    ]
  },
  {
    date: '2026-10-11',
    version: 'v2.314',
    items: [
      item(
        'new',
        'Чип покоління авто з Wikidata та Wikipedia і секція характеристик за поколіннями',
        'Чип поколения авто из Wikidata и Wikipedia и секция характеристик по поколениям',
        'Car-generation chip from Wikidata and Wikipedia, and a generation specs section'
      ),
      item(
        'new',
        'Рейтинги за характеристиками на /stats; пояснення та джерела на /stats, /fuel, /safety',
        'Рейтинги по характеристикам на /stats; пояснения и источники на /stats, /fuel, /safety',
        'Spec rankings on /stats; explanations and sources on /stats, /fuel and /safety'
      ),
      item(
        'new',
        'Маршрут /relax і спільні розкладки фону; повноекранна гра та мобільна підтримка',
        'Маршрут /relax и общие раскладки фона; полноэкранная игра и мобильная поддержка',
        '/relax route with shareable layouts; full-screen racer with mobile support'
      ),
      item(
        'new',
        'Переклад рекламацій та тексту джерел на пристрої або через Google',
        'Перевод отзывных кампаний и текста источников на устройстве или через Google',
        'On-device or Google translation of recalls and source text'
      ),
      item(
        'improved',
        'Щільніша мобільна картка, анімована модалка пробігу MOT, рекламації та MOT у «Копіювати все»',
        'Более плотная мобильная карточка, анимированная модалка пробега MOT, отзывы и MOT в «Копировать всё»',
        'Denser mobile card, animated MOT mileage modal, recalls and MOT in “Copy all info”'
      ),
      item(
        'data',
        'Фото КрАЗ з Wikimedia, ширше покриття поколінь і характеристик',
        'Фото КрАЗ из Wikimedia, шире покрытие поколений и характеристик',
        'Wikimedia photos for KrAZ trucks, wider generation and spec coverage'
      )
    ]
  },
  {
    date: '2026-10-10',
    version: 'v2.287',
    items: [
      item(
        'new',
        'Рекламації та скарги власників США (NHTSA) і кампанії Transport Canada',
        'Отзывные кампании и жалобы владельцев США (NHTSA) и кампании Transport Canada',
        'US recalls and owner complaints (NHTSA) and Transport Canada campaigns'
      ),
      item(
        'new',
        'Британський MOT: «Типові несправності» та калькулятор «мій пробіг»',
        'Британский MOT: «Типичные неисправности» и калькулятор «мой пробег»',
        'UK MOT “Common faults” section with a “my mileage” calculator'
      ),
      item(
        'new',
        'Окрема секція «Орієнтовна вартість»; панель силових установок на /fuel; фільтр статусу реєстрації',
        'Отдельная секция «Ориентировочная стоимость»; панель силовых установок на /fuel; фильтр статуса регистрации',
        'Dedicated “Estimated value” section; powertrains panel on /fuel; registration-status filter'
      ),
      item(
        'improved',
        'Лінія-нитка біля відкритих секцій, кнопки «нагору» і «згорнути все»',
        'Линия-нить у открытых секций, кнопки «наверх» и «свернуть всё»',
        'Thread line beside open sections, back-to-top and collapse-all buttons'
      ),
      item(
        'data',
        'Об’єднання назв ZAZ/Daewoo в одну родину; фото BMW-мотоциклів; запасний ланцюжок статей uk→ru→en',
        'Объединение названий ZAZ/Daewoo в одно семейство; фото BMW-мотоциклов; запасная цепочка статей uk→ru→en',
        'ZAZ/Daewoo names unified into one family; BMW motorcycle photos; uk→ru→en article fallback'
      )
    ]
  },
  {
    date: '2026-10-09',
    version: 'v2.260',
    items: [
      item(
        'new',
        'Орієнтовна вартість авто: крива амортизації, українська митниця, курси НБУ',
        'Ориентировочная стоимость авто: кривая амортизации, украинская таможня, курсы НБУ',
        'Estimated car value: depreciation curve, Ukrainian customs data, NBU rates'
      ),
      item(
        'new',
        'Блоки «Відкликання» (ЄС) та «Електро» (Open EV Data)',
        'Блоки «Отзывы» (ЕС) и «Электро» (Open EV Data)',
        'EU “Recalls” and “Electric” (Open EV Data) blocks'
      ),
      item(
        'new',
        'Найважчі й найлегші моделі за групами; Stack Exchange і Lemmy у соцмережах і віджетах',
        'Самые тяжёлые и лёгкие модели по группам; Stack Exchange и Lemmy в соцсетях и виджетах',
        'Heaviest/lightest models by group; Stack Exchange and Lemmy in Social and widgets'
      ),
      item(
        'improved',
        'Секції завантажуються при розгортанні, окремі чанки мов, WebP-логотипи - швидше відкриття',
        'Секции загружаются при раскрытии, отдельные чанки языков, WebP-логотипы - быстрее открытие',
        'Sections load on expand, per-language chunks and WebP logos for faster loads'
      ),
      item(
        'improved',
        'Локалізовані назви областей, пошук і мітки в обраному, окремий /race з пресетами авто',
        'Локализованные названия областей, поиск и метки в избранном, отдельный /race с пресетами авто',
        'Localised region names, favorites search and label filter, standalone /race with car presets'
      )
    ]
  },
  {
    date: '2026-10-08',
    version: 'v2.230',
    items: [
      item(
        'new',
        'Безкоштовний тест-драйв: гра-гонки в браузері',
        'Бесплатный тест-драйв: гонки в браузере',
        'Free test drive: in-browser racer game'
      ),
      item(
        'new',
        'Характеристики ЄС (RDW, NL): габарити, вага, ціна, паливо, запас ходу електро',
        'Характеристики ЕС (RDW, NL): габариты, вес, цена, топливо, запас хода электро',
        'EU specs (RDW, NL): dimensions, weight, price, fuel, EV range'
      ),
      item(
        'new',
        'Перехресні назви марок («також відомий як»), моделі мото/вантажівок/автобусів, статистика за класами',
        'Перекрёстные названия марок («также известен как»), модели мото/грузовиков/автобусов, статистика по классам',
        'Cross-make aliases (“Also known as”), motorcycle/truck/bus matching and per-class stats'
      ),
      item(
        'new',
        'Сторінка VIN: типові дані моделі та локалізований розшифрований VIN; відео honda.ua; 360° інтер’єр',
        'Страница VIN: типичные данные модели и локализованная расшифровка VIN; видео honda.ua; 360° интерьер',
        'VIN page: typical model data and localised decode; honda.ua videos; 360° interiors'
      ),
      item(
        'improved',
        'AVIF/WebP зображення, значки спецтехніки, логотипи мотоциклів і малих українських виробників',
        'AVIF/WebP изображения, значки спецтехники, логотипы мотоциклов и малых украинских производителей',
        'AVIF/WebP images, special-purpose body icons, motorcycle and small Ukrainian maker logos'
      )
    ]
  },
  {
    date: '2026-10-07',
    version: 'v2.206',
    items: [
      item(
        'new',
        'Синхронізація обраного й історії між пристроями; сторінка /settings; мітки обраного',
        'Синхронизация избранного и истории между устройствами; страница /settings; метки избранного',
        'Favorites/history sync across devices; /settings page; favorite labels'
      ),
      item(
        'new',
        'Міжринкові дані VehiclesDB (чипи, панель на /stats)',
        'Межрыночные данные VehiclesDB (чипы, панель на /stats)',
        'VehiclesDB cross-market data (chips and a /stats Markets panel)'
      ),
      item(
        'new',
        'Офіційні нові/вживані авто в наявності, секція «Соцмережі», український номерний знак і штрих-код VIN',
        'Официальные новые/подержанные авто в наличии, секция «Соцсети», украинский номерной знак и штрих-код VIN',
        '“Cars in stock”, Social section, Ukrainian plate badge and VIN barcode'
      ),
      item(
        'new',
        'Розширений пошук: фільтр за текстом кузова з автодоповненням, марка з 2 символів',
        'Расширенный поиск: фильтр по тексту кузова с автодополнением, марка из 2 символов',
        'Advanced search: body-text filter with autocomplete, 2-character make'
      ),
      item(
        'data',
        'Нові відео YouTube для моделей без огляду; нова стрічка autoevolution',
        'Новые видео YouTube для моделей без обзора; новая лента autoevolution',
        'More YouTube fallback videos; new autoevolution feed'
      )
    ]
  },
  {
    date: '2026-10-06',
    version: 'v2.185',
    items: [
      item(
        'new',
        'Вхід через Google, платні опції та адмін-сторінка',
        'Вход через Google, платные опции и админ-страница',
        'Google sign-in, paid-feature opt-ins and an admin page'
      ),
      item(
        'new',
        'Архів /news з пагінацією, фільтрами джерел та пошуком; відео з каналів брендів',
        'Архив /news с пагинацией, фильтрами источников и поиском; видео с каналов брендов',
        '/news archive with pagination, source filters and search; brand YouTube channel videos'
      ),
      item(
        'new',
        'Віджети Bluesky і курсу акцій; трансляція Dream Trips ISS 24/7',
        'Виджеты Bluesky и курса акций; трансляция Dream Trips ISS 24/7',
        'Bluesky and share-price widgets; Dream Trips ISS 24/7 stream'
      ),
      item(
        'improved',
        'Скелетони для сторінок статистики; режим «підпилий» та одиниці об’єму у картці',
        'Скелетоны для страниц статистики; режим «подвыпивший» и единицы объёма в карточке',
        'Skeleton placeholders on stats pages; drunk mode and capacity units on the card'
      ),
      item(
        'data',
        'Фото Wikimedia для всіх моделей (112 тис. записів)',
        'Фото Wikimedia для всех моделей (112 тыс. записей)',
        'Wikimedia photos pre-warmed for every model (112k rows)'
      )
    ]
  },
  {
    date: '2026-10-05',
    version: 'v2.166',
    items: [
      item(
        'new',
        '3D-моделі Sketchfab та 360°-галереї CarShow360',
        '3D-модели Sketchfab и 360°-галереи CarShow360',
        'Sketchfab 3D models and CarShow360 360° galleries'
      ),
      item(
        'new',
        'Автоновини з RSS: стрічка на головній, секція в картці, віджет',
        'Автоновости из RSS: лента на главной, секция в карточке, виджет',
        'RSS auto-news: homepage ticker, result-card section and widget'
      ),
      item(
        'new',
        'Тест-драйви TopGear UK, ITC.ua, Mezha; пошук VIN за фото (штрих-код + OCR)',
        'Тест-драйвы TopGear UK, ITC.ua, Mezha; поиск VIN по фото (штрих-код + OCR)',
        'TopGear UK, ITC.ua and Mezha reviews; VIN photo search (barcode + OCR)'
      ),
      item(
        'new',
        'Шари фону з трафіком і містом; бічна панель-накладка на десктопі',
        'Слои фона с трафиком и городом; боковая панель-накладка на десктопе',
        'Traffic and city stream layers; overlay sidebar on desktop'
      ),
      item(
        'data',
        'Кеш головних фото Wikimedia в БД; CSV-дані відгуків e-drive та відео infocar',
        'Кэш главных фото Wikimedia в БД; CSV-данные отзывов e-drive и видео infocar',
        'DB-backed Wikimedia hero-photo cache; e-drive posts and infocar videos as seed CSVs'
      )
    ]
  },
  {
    date: '2026-10-04',
    version: 'v2.144',
    items: [
      item(
        'new',
        'Окрема секція «Відео-огляди»; секція «Перевірка»; шари фону (мапа міста, потоки NASA ISS)',
        'Отдельная секция «Видео-обзоры»; секция «Проверка»; слои фона (карта города, потоки NASA ISS)',
        'Separate Video reviews section; Verification links; background layers (city map, NASA ISS streams)'
      ),
      item(
        'improved',
        'Пояснення та категорії операцій в історії реєстрації; явна кнопка «Пошук»',
        'Пояснения и категории операций в истории регистрации; явная кнопка «Поиск»',
        'Registration-history operations explained and categorised; explicit Search button'
      ),
      item(
        'improved',
        'Мітки палива/безпеки в заголовках та менший логотип бренду',
        'Метки топлива/безопасности в заголовках и меньший логотип бренда',
        'Fuel/safety title markers and a smaller inline brand logo'
      )
    ]
  },
  {
    date: '2026-10-03',
    version: 'v2.134',
    items: [
      item(
        'new',
        'Секція «Огляди та тест-драйви»: каталог infocar, відео, пости власників e-drive, DRIVE2',
        'Секция «Обзоры и тест-драйвы»: каталог infocar, видео, посты владельцев e-drive, DRIVE2',
        'Reviews & test drives: infocar catalog and videos, e-drive owner posts, DRIVE2'
      ),
      item(
        'new',
        'Орієнтовна кількість власників; невдалі пошуки зберігаються в історії',
        'Ориентировочное число владельцев; неудачные поиски сохраняются в истории',
        'Estimated owner count; missed lookups are saved to history'
      ),
      item(
        'improved',
        'Пояснення «?» до полів і заголовків, пояснення частин номера, спільні заголовки секцій',
        'Пояснения «?» к полям и заголовкам, пояснения частей номера, общие заголовки секций',
        '“?” popovers on fields and headings, plate-part explainer, shared section headers'
      ),
      item(
        'data',
        'Точне покриття даних номерів: січень 2013 – 29.04.2026',
        'Точное покрытие данных номеров: январь 2013 – 29.04.2026',
        'Exact plate-data coverage stated: Jan 2013 – 29.04.2026'
      )
    ]
  },
  {
    date: '2026-10-02',
    version: 'v2.117',
    items: [
      item(
        'new',
        'Витрата пального та CO₂ (EPA + EEA): бейдж у картці та сторінка /fuel',
        'Расход топлива и CO₂ (EPA + EEA): бейдж в карточке и страница /fuel',
        'Fuel economy and CO₂ (EPA + EEA): result-card badge and /fuel page'
      ),
      item(
        'new',
        'Зведена сторінка краш-тестів /safety; чипи рейтингів палива й безпеки',
        'Сводная страница краш-тестов /safety; чипы рейтингов топлива и безопасности',
        'Combined crash-rating page /safety; fuel and safety ranking chips'
      ),
      item(
        'new',
        'Вкладка «Огляд» для VIN, анімації View Transitions, широкий колірний охват P3',
        'Вкладка «Обзор» для VIN, анимации View Transitions, широкий цветовой охват P3',
        'VIN overview tab, View Transitions for routes, P3 wide-gamut colours'
      ),
      item(
        'improved',
        'Логотипи брендів у списках та експорті (+38 нових); швидший /api/stats',
        'Логотипы брендов в списках и экспорте (+38 новых); более быстрый /api/stats',
        'Brand logos in lists and exports (+38 new); faster /api/stats'
      )
    ]
  },
  {
    date: '2026-10-01',
    version: 'v2.93',
    items: [
      item(
        'new',
        'AR-сканування номерів у браузері в реальному часі',
        'AR-сканирование номеров в браузере в реальном времени',
        'Live in-browser AR plate scanning'
      ),
      item('new', 'Темна тема', 'Тёмная тема', 'Dark mode'),
      item(
        'new',
        'Попередній перегляд посилань, динамічний заголовок вкладки; інформація про номер, якого немає в базі',
        'Предпросмотр ссылок, динамический заголовок вкладки; информация о номере, которого нет в базе',
        'Link previews, dynamic tab title; plate info when nothing is found'
      ),
      item(
        'improved',
        'Розпізнавання: поворот за EXIF, стикові номери, форми українських номерів, мобільна камера',
        'Распознавание: поворот по EXIF, двухрядные номера, формы украинских номеров, мобильная камера',
        'Recognition: EXIF rotation, stacked plates, Ukrainian plate shapes, native mobile camera'
      )
    ]
  },
  {
    date: '2026-09-30',
    version: 'v2.77',
    items: [
      item(
        'improved',
        'Розпізнавання номерів: плиткове виявлення, рамки та збільшуване фото; без хмарного запасного варіанту',
        'Распознавание номеров: плиточное обнаружение, рамки и увеличиваемое фото; без облачного запасного варианта',
        'Plate recognition: tiled detection, plate boxes, zoomable preview; cloud fallback removed'
      )
    ]
  },
  {
    date: '2026-09-29',
    version: 'v2.74',
    items: [
      item(
        'new',
        'Встановлюваний застосунок (PWA) з офлайн-режимом',
        'Устанавливаемое приложение (PWA) с офлайн-режимом',
        'Installable PWA with offline mode'
      ),
      item(
        'new',
        'Карта сервісів, дилерів і страхових поруч; топ-5 марок/моделей/кольорів/областей на головній',
        'Карта сервисов, дилеров и страховых рядом; топ-5 марок/моделей/цветов/областей на главной',
        'Nearby mechanics/dealers/insurance map; top-5 makes/models/colours/regions on the homepage'
      )
    ]
  },
  {
    date: '2026-09-28',
    version: 'v2.69',
    items: [
      item(
        'new',
        'Головне фото з Вікіпедії у результатах і попередження про точність розпізнавання',
        'Главное фото из Википедии в результатах и предупреждение о точности распознавания',
        'Wikipedia hero image on results and a photo-recognition accuracy warning'
      ),
      item(
        'improved',
        'Кнопка копіювання номера та VIN',
        'Кнопка копирования номера и VIN',
        'Copy button on plate and VIN'
      )
    ]
  },
  {
    date: '2026-09-27',
    version: 'v2.67',
    items: [
      item(
        'new',
        'Розширений пошук з фільтром областей і спільними URL',
        'Расширенный поиск с фильтром областей и общими URL',
        'Advanced search with region filter and shareable URLs'
      ),
      item(
        'new',
        'Власне розпізнавання номерів на сервері; обговорення /discuss',
        'Собственное распознавание номеров на сервере; обсуждение /discuss',
        'Self-hosted plate recognition; /discuss route'
      ),
      item(
        'improved',
        'Нова сторінка «Про сервіс» з повною юридичною інформацією; кольорові кружки біля кольору авто',
        'Новая страница «О сервисе» с полной юридической информацией; цветные кружки у цвета авто',
        'Rewritten About page with full legal content; colour swatches next to colour labels'
      )
    ]
  },
  {
    date: '2026-09-26',
    version: 'v2.58',
    items: [
      item(
        'new',
        'Краш-тести C-NCAP, KNCAP та IIHS (разом із Euro NCAP, JNCAP, NHTSA - шість джерел)',
        'Краш-тесты C-NCAP, KNCAP и IIHS (вместе с Euro NCAP, JNCAP, NHTSA - шесть источников)',
        'C-NCAP, KNCAP and IIHS crash tests (six rating sources in total)'
      ),
      item(
        'new',
        '«Копіювати все»: буфер, txt, md, csv, docx, pdf; експорт історії й обраного',
        '«Копировать всё»: буфер, txt, md, csv, docx, pdf; экспорт истории и избранного',
        '“Copy all info” export (clipboard/txt/md/csv/docx/pdf); History/Favorites export'
      ),
      item(
        'new',
        'Статті Вікіпедії у картці та як тло; посилання на розгорнуті секції',
        'Статьи Википедии в карточке и как фон; ссылки на раскрытые секции',
        'Wikipedia summary and background; share links for expanded sections'
      )
    ]
  },
  {
    date: '2026-09-25',
    version: 'v2.50',
    items: [
      item(
        'new',
        'Краш-тести Euro NCAP та JNCAP; посилання на сайт бренду та статтю моделі у Вікіпедії',
        'Краш-тесты Euro NCAP и JNCAP; ссылки на сайт бренда и статью модели в Википедии',
        'Euro NCAP and JNCAP ratings; brand website and per-model Wikipedia links'
      ),
      item(
        'new',
        'Світіння під колір авто, 3D-нахил картки за курсором, фон-фото з паралаксом',
        'Свечение под цвет авто, 3D-наклон карточки за курсором, фон-фото с параллаксом',
        'Colour-matched glow, 3D cursor-tilt on cards, parallax photo background'
      ),
      item(
        'fix',
        'Хибні збіги рейтингів для BMW/Mercedes і Honda Odyssey (JDM)',
        'Ложные совпадения рейтингов для BMW/Mercedes и Honda Odyssey (JDM)',
        'Wrong rating matches for BMW/Mercedes and the JDM Honda Odyssey'
      )
    ]
  },
  {
    date: '2026-09-24',
    version: 'v2.38',
    items: [
      item(
        'new',
        'Краш-тести NHTSA у результатах; карусель фото Pixabay',
        'Краш-тесты NHTSA в результатах; карусель фото Pixabay',
        'NHTSA crash ratings on results; Pixabay photo carousel'
      ),
      item(
        'new',
        'Анімований значок типу авто, логотип бренду як водяний знак, розбивка за марками на /stats',
        'Анимированный значок типа авто, логотип бренда как водяной знак, разбивка по маркам на /stats',
        'Animated vehicle-kind icon, brand-logo watermark, make breakdown on /stats'
      ),
      item(
        'improved',
        'Історія перепризначення номерів поруч з історією VIN; ховер-ефекти картки',
        'История переназначения номеров рядом с историей VIN; ховер-эффекты карточки',
        'Plate-reassignment history next to VIN history; card hover polish'
      )
    ]
  },
  {
    date: '2026-09-23',
    version: 'v2.26',
    items: [
      item(
        'new',
        'Статистика реєстру: сторінка /stats з картою та роками',
        'Статистика реестра: страница /stats с картой и годами',
        'Registry statistics: /stats page with map and year range'
      ),
      item(
        'new',
        'Історія реєстрації у вигляді доріжки доставки, значок типу пального з поясненням',
        'История регистрации в виде трекинга доставки, значок типа топлива с пояснением',
        'Shipping-style registration timeline, fuel-type icon with explanation'
      ),
      item(
        'improved',
        'Ширші картки результатів; мова за замовчуванням - українська',
        'Более широкие карточки результатов; язык по умолчанию - украинский',
        'Wider result cards; Ukrainian is the default language'
      )
    ]
  },
  {
    date: '2026-09-22',
    version: 'v2.17',
    items: [
      item(
        'new',
        'Історія реєстрацій авто, локальна історія пошуку та обране',
        'История регистраций авто, локальная история поиска и избранное',
        'Plate registration history, local search history and favorites'
      ),
      item('new', 'Пошук за фото та камерою', 'Поиск по фото и камере', 'Search by image and by camera'),
      item(
        'improved',
        'Підказки-посилання та плавне відкриття вмісту',
        'Подсказки-ссылки и плавное раскрытие содержимого',
        'Link pointers and smooth content-opening animations'
      )
    ]
  },
  {
    date: '2026-09-21',
    version: 'v2.9',
    items: [
      item(
        'improved',
        'Автодоповнення в полі пошуку',
        'Автодополнение в поле поиска',
        'Autocomplete on the search field'
      ),
      item(
        'data',
        'Виправлено завантаження реальних даних; режими --after/--full',
        'Исправлена загрузка реальных данных; режимы --after/--full',
        'Real-data ingest fixed; --after and --full modes'
      )
    ]
  },
  {
    date: '2026-09-09',
    version: 'v2.2',
    items: [
      item(
        'new',
        'Перший реліз: пошук авто за номером і VIN (реєстр data.gov.ua, розшифровка VIN через NHTSA)',
        'Первый релиз: поиск авто по номеру и VIN (реестр data.gov.ua, расшифровка VIN через NHTSA)',
        'First release: vehicle lookup by plate and VIN (data.gov.ua registry, NHTSA VIN decoding)'
      ),
      item(
        'data',
        'Макет реєстру 2026 року: номер може бути порожнім, ключ - VIN',
        'Макет реестра 2026 года: номер может быть пустым, ключ - VIN',
        '2026 registry layout: nullable plate, rows keyed on VIN'
      )
    ]
  }
]
