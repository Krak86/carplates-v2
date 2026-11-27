import { item } from './core.js'
import type { ReleaseDay } from './core.js'

/** 2026-11: newest day first. */
export const DAYS: readonly ReleaseDay[] = [
  {
    date: '2026-11-27',
    version: 'v2.1544',
    items: [
      item(
        'improved',
        'Запити сервера до зовнішніх джерел (розшифрування VIN, фото, рейтинги безпеки, перевірка ботів) тепер мають ліміт часу й розміру відповіді та перевіряють її формат; пошук фото й відео краш-тестів мають власні ліміти запитів, а кнопка «Відкрити оголошення» веде лише на відомі майданчики',
        'Запросы сервера к внешним источникам (расшифровка VIN, фото, рейтинги безопасности, проверка ботов) теперь имеют лимит времени и размера ответа и проверяют его формат; поиск фото и видео краш-тестов имеют собственные лимиты запросов, а кнопка «Открыть объявление» ведёт только на известные площадки',
        'Server requests to outside sources (VIN decode, photos, safety ratings, bot check) now have a time and response-size limit and check the response format; photo search and crash-test videos have their own rate limits, and the "Open listing" button only leads to known marketplaces'
      ),
      item(
        'improved',
        'У розділі «Про застосунок» додано Backblaze B2 до джерел (архів логів сервера), а в пункті про безпеку згадано ліміти зовнішніх запитів і перевірку посилань на оголошення',
        'В разделе «О приложении» добавлен Backblaze B2 в источники (архив логов сервера), а в пункте о безопасности упомянуты лимиты внешних запросов и проверка ссылок на объявления',
        'The About page now lists Backblaze B2 among the sources (server log archive), and the security entry mentions the limits on outside requests and the listing-link check'
      ),
      item(
        'improved',
        "В адмінці з'явилась вкладка «Логи»: пошук і фільтри за контейнером, рівнем і часом, режим «Наживо»; номери, VIN, e-mail та IP у логах частково замасковані",
        'В админке появилась вкладка «Логи»: поиск и фильтры по контейнеру, уровню и времени, режим «Вживую»; номера, VIN, e-mail и IP в логах частично замаскированы',
        'The admin page has a new "Logs" tab: search and filters by container, level and time, a "Live" mode; plates, VINs, e-mails and IPs in the logs are partly masked'
      ),
      item(
        'improved',
        'У розділі «Про застосунок» оновлено пункт про безпеку: security.txt, приватне повідомлення про вразливості та часткове маскування персональних даних у логах сервера',
        'В разделе «О приложении» обновлен пункт о безопасности: security.txt, приватное сообщение об уязвимостях и частичное маскирование персональных данных в логах сервера',
        'The About page security entry now mentions security.txt, private vulnerability reporting and the partial masking of personal data in server logs'
      )
    ]
  },
  {
    date: '2026-11-26',
    version: 'v2.1526',
    items: [
      item(
        'improved',
        'Завантаження фото для розпізнавання номера й VIN тепер перевіряє справжній тип файлу, а не лише розширення; якщо формат не підтримується (HEIC, GIF, AVIF), повідомлення прямо каже, що підходять лише JPEG, PNG і WebP',
        'Загрузка фото для распознавания номера и VIN теперь проверяет настоящий тип файла, а не только расширение; если формат не поддерживается (HEIC, GIF, AVIF), сообщение прямо говорит, что подходят только JPEG, PNG и WebP',
        'Photo upload for plate and VIN recognition now checks the real file type, not just the extension; for an unsupported format (HEIC, GIF, AVIF) the message says plainly that only JPEG, PNG and WebP work'
      ),
      item(
        'improved',
        'Історія оновлень даних більше не має смуги прокрутки: показано лише початок списку, решта плавно розгортається кнопкою «Показати більше»',
        'История обновлений данных больше не имеет полосы прокрутки: показано лишь начало списка, остальное плавно раскрывается кнопкой «Показать больше»',
        'The data update history no longer has a scrollbar: only the top of the list shows, and a "Show more" button smoothly expands the rest'
      )
    ]
  },
  {
    date: '2026-11-25',
    version: 'v2.1502',
    items: [
      item(
        'improved',
        'У грі-гонці зіткнення більше не зупиняють авто: воно проїжджає крізь перешкоду з меншою швидкістю, а удар супроводжується плавною анімацією',
        'В игре-гонке столкновения больше не останавливают авто: оно проезжает сквозь препятствие с меньшей скоростью, а удар сопровождается плавной анимацией',
        'In the racer game a collision no longer stops the car: it drives through the obstacle at a lower speed, with a smooth bump animation'
      )
    ]
  },
  {
    date: '2026-11-24',
    version: 'v2.1501',
    items: [
      item(
        'new',
        'У грі-гонці: кнопка «Поділитися налаштуваннями» (однакове посилання на /race і з номера), режими «Релакс» і «Хардкор», задній хід (↓ після зупинки), вибір виду (ззаду, зверху, низько, від першої особи), смужка пройденого тест-драйву, а «Спочатку» тепер ремонтує авто',
        'В игре-гонке: кнопка «Поделиться настройками» (одинаковая ссылка на /race и из номера), режимы «Релакс» и «Хардкор», задний ход (↓ после остановки), выбор вида (сзади, сверху, низко, от первого лица), полоска пройденного тест-драйва, а «Заново» теперь ремонтирует авто',
        'The racer game gets a "Share settings" button (the same /race link from a plate or the game page), Relax and Hardcore modes, reverse (↓ after stopping), a camera view switch (behind, high, low, first person), a test drive progress line, and Restart now repairs the car'
      ),
      item(
        'fix',
        'Посилання на спільне фото більше не залишає токен в адресному рядку, а аналітика й звіти про помилки не отримують токен, номери та VIN',
        'Ссылка на общее фото больше не оставляет токен в адресной строке, а аналитика и отчёты об ошибках не получают токен, номера и VIN',
        'A shared-photo link no longer leaves its token in the address bar, and analytics and error reports no longer receive the token, plates or VINs'
      ),
      item(
        'improved',
        'Збережені порівняння на /compare тепер синхронізуються між пристроями разом з обраним та історією (після входу в акаунт)',
        'Сохранённые сравнения на /compare теперь синхронизируются между устройствами вместе с избранным и историей (после входа в аккаунт)',
        'Saved comparisons on /compare now sync across your devices together with favorites and history (when signed in)'
      ),
      item(
        'improved',
        'У «Про додаток» додано джерела (TradingView, RST, baza-gai, Opendatabot, ICCT, норми паркомісць), а політика конфіденційності, діалог видалення акаунта та /install тепер згадують збережені порівняння',
        'В «О приложении» добавлены источники (TradingView, RST, baza-gai, Opendatabot, ICCT, нормы парковочных мест), а политика конфиденциальности, диалог удаления аккаунта и /install теперь упоминают сохранённые сравнения',
        'The About page lists more sources (TradingView, RST, baza-gai, Opendatabot, ICCT, parking-space norms), and the privacy policy, delete-account dialog and /install now mention saved comparisons'
      ),
      item(
        'improved',
        'Сторінка «Про додаток» тепер має зміст «На цій сторінці» з посиланнями на ліцензію, короткий опис, можливості та джерела',
        'Страница «О приложении» теперь имеет оглавление «На этой странице» со ссылками на лицензию, краткое описание, возможности и источники',
        'The About page now has an On this page table of contents linking to the license, brief, features and sources sections'
      ),
      item(
        'improved',
        'Розділ «Про додаток» оновлено: опис перевірки (офіційні й неофіційні тести ПДР), аукціонів (лише авто, «Поділитися фільтрами»), статистики (згорнуті таблиці на телефоні) і карти сайту (зміст «На цій сторінці»)',
        'Раздел «О приложении» обновлен: описание проверки (официальные и неофициальные тесты ПДД), аукционов (только авто, «Поделиться фильтрами»), статистики (свернутые таблицы на телефоне) и карты сайта (оглавление «На этой странице»)',
        'The About page is up to date: the descriptions of verification (official and unofficial traffic-rules tests), auctions (cars only, Share filters), statistics (collapsed tables on phones) and the site map (On this page contents)'
      ),
      item(
        'improved',
        'На сторінках /install, /sitemap і /data-status з’явився зміст «На цій сторінці» з посиланнями на розділи',
        'На страницах /install, /sitemap и /data-status появилось оглавление «На этой странице» со ссылками на разделы',
        'The /install, /sitemap and /data-status pages now have an On this page table of contents linking to their sections'
      ),
      item(
        'improved',
        'У «Перевірці» поруч з офіційними тестами ПДР (.gov.ua) додано неофіційні тренувальні тести pdr-testy.com.ua (гнучкіші), з позначками, посиланням у розділі «Про додаток» і в іграх «Гонки»; сервіси mvs.gov.ua тепер з логотипом ГСЦ МВС, а офіційні тести ПДР - з власним логотипом',
        'В «Проверке» рядом с официальными тестами ПДД (.gov.ua) добавлены неофициальные тренировочные тесты pdr-testy.com.ua (более гибкие), с пометками, ссылкой в разделе «О приложении» и в игре «Гонки»; сервисы mvs.gov.ua теперь с логотипом ГСЦ МВД, а официальные тесты ПДД - с собственным логотипом',
        'Verification now lists the unofficial, more flexible pdr-testy.com.ua practice tests next to the official .gov.ua traffic-rules tests, with notes, an About page link and a link under the race game; mvs.gov.ua services now show the HSC logo and the official tests their own logo'
      ),
      item(
        'improved',
        'На телефоні таблиці за областями на /auctions, /stats і /wanted згорнуті, кнопка «Показати більше» плавно розкриває їх повністю; на /stats додано відступ перед блоком «Пов’язана статистика»',
        'На телефоне таблицы по областям на /auctions, /stats и /wanted свернуты, кнопка «Показать больше» плавно раскрывает их полностью; на /stats добавлен отступ перед блоком «Связанная статистика»',
        'On phones the region tables on /auctions, /stats and /wanted are collapsed and a Show more button smoothly opens them in full; /stats also gets a gap before the Related statistics block'
      )
    ]
  },
  {
    date: '2026-11-23',
    version: 'v2.1480',
    items: [
      item(
        'improved',
        'Аукціони: за замовчуванням лише авто (продаж майна, де авто лише один із активів, прихований), є перемикач «Лише авто» і кнопка «Поділитися фільтрами»',
        'Аукционы: по умолчанию только авто (продажа имущества, где авто лишь один из активов, скрыта), есть переключатель «Только авто» и кнопка «Поделиться фильтрами»',
        'Auctions: cars only by default (property sales that merely include a vehicle are hidden), with a Cars only switch and a Share filters button'
      )
    ]
  },
  {
    date: '2026-11-21',
    version: 'v2.1468',
    items: [
      item(
        'improved',
        'Безпека: політика CSP тепер діє (браузер блокує все, що не дозволено), а небезпечні http-запити автоматично переходять на https.',
        'Безопасность: политика CSP теперь действует (браузер блокирует всё, что не разрешено), а небезопасные http-запросы автоматически переходят на https.',
        'Security: the CSP is now enforced (the browser blocks anything not allowed) and insecure http requests are upgraded to https automatically.'
      ),
      item(
        'improved',
        'Сторінка «Про сервіс» доповнена: нові короткі пункти про пояснення, чому номера немає, та швидке завантаження, оновлені описи фото, посилань, акаунта та безпеки',
        'Страница «О сервисе» дополнена: новые короткие пункты про объяснение, почему номера нет, и быструю загрузку, обновлены описания фото, ссылок, аккаунта и безопасности',
        'The About page is updated: new brief entries on why a plate is missing and fast loading, and refreshed descriptions of photos, links, the account and security'
      ),
      item(
        'improved',
        'Вихід з акаунта тепер просить підтвердження, щоб випадковий клік не розлогінив вас: коротко пояснюємо, що ви матимете, якщо залишитесь в акаунті',
        'Выход из аккаунта теперь просит подтверждение, чтобы случайный клик не разлогинил вас: коротко объясняем, что вы получите, если останетесь в аккаунте',
        'Signing out now asks for confirmation so an accidental click does not log you out, with a short note on what you keep by staying signed in'
      ),
      item(
        'improved',
        'Посилання на розділи тривог тепер короткі: /s/losses та /s/map (без слова alarms), старі адреси працюють як раніше',
        'Ссылки на разделы тревог теперь короткие: /s/losses и /s/map (без слова alarms), старые адреса работают как раньше',
        'Alerts section links are now short: /s/losses and /s/map (no "alarms" in the address); the old addresses keep working'
      ),
      item(
        'improved',
        'Кнопка «Зберегти як картинку» тепер у кінці списку позначок картки авто (видно після «Показати більше»)',
        'Кнопка «Сохранить как картинку» теперь в конце списка отметок карточки авто (видна после «Показать больше»)',
        'The "Save as image" button now sits at the end of the car card chips (visible after "Show more")'
      ),
      item(
        'improved',
        'Фото авто на сторінці результату тепер гортаються стрілками, клавішами ← →, крапками та свайпом на самому фото, а стрічка мініатюр більше не скролиться вручну і не змінює висоту, тож макет не стрибає',
        'Фото авто на странице результата теперь листаются стрелками, клавишами ← →, точками и свайпом на самом фото, а лента миниатюр больше не скроллится вручную и не меняет высоту, поэтому макет не прыгает',
        'Car photos on the result page now page through with arrows, the Left/Right keys, dots and a swipe on the photo itself, and the thumbnail strip no longer scrolls by hand or changes height, so the layout does not shift'
      )
    ]
  },
  {
    date: '2026-11-20',
    version: 'v2.1451',
    items: [
      item(
        'improved',
        'Посилання на розділи (номер, VIN, тривоги) тепер мають власну адресу виду /s/номер/розділ, тож Telegram та інші месенджери показують для кожного розділу своє превʼю; сторінка «Тест-драйв» має скріншот гри замість текстової картки',
        'Ссылки на разделы (номер, VIN, тревоги) теперь имеют собственный адрес вида /s/номер/раздел, поэтому Telegram и другие мессенджеры показывают для каждого раздела своё превью; у страницы «Тест-драйв» скриншот игры вместо текстовой карточки',
        'Section links (plate, VIN, alerts) now have their own address like /s/plate/section, so Telegram and other messengers show a separate preview for each section; the Test drive page has a game screenshot instead of a text card'
      ),
      item(
        'fix',
        'На головній сторінці та в розділі «Читати: рекорди» знову відображаються підписи статистики замість службових ключів',
        'На главной странице и в разделе «Читать: рекорды» снова отображаются подписи статистики вместо служебных ключей',
        'The home page and the Read extremes guide show the statistics labels again instead of raw keys'
      ),
      item(
        'improved',
        'Тексти розшифровки VIN, картки авто та рейтингів безпеки завантажуються лише коли вони потрібні, тож решта сторінок відкривається легше',
        'Тексты расшифровки VIN, карточки авто и рейтингов безопасности загружаются только когда они нужны, поэтому остальные страницы открываются легче',
        'The VIN decoding, vehicle card and safety rating texts load only when they are needed, so the other pages open lighter'
      ),
      item(
        'improved',
        'Путівники «Читати», порівняння авто та статистика завантажують свої тексти лише коли ви на них заходите, а вкладки розмірів - коли їх відкриваєте, тож словник першого екрана ще менший',
        'Путеводители «Читать», сравнение авто и статистика загружают свои тексты только когда вы на них заходите, а вкладки размеров - когда их открываете, поэтому словарь первого экрана ещё меньше',
        'The Read guides, the car comparison and the statistics load their texts only when you open them, and the size tabs when you open a tab, so the first screen dictionary is smaller still'
      ),
      item(
        'improved',
        'Сторінки «Про сервіс», налаштувань, профілю, карти сайту та кілька інших завантажують свої тексти лише коли ви на них заходите, тож перший екран отримує менший словник',
        'Страницы «О сервисе», настроек, профиля, карты сайта и несколько других загружают свои тексты только когда вы на них заходите, поэтому первый экран получает меньший словарь',
        'The About, settings, profile, sitemap and a few other pages load their texts only when you open them, so the first screen gets a smaller dictionary'
      ),
      item(
        'improved',
        'Англійська версія сайту завантажує менше даних: замість повного українського словника довантажується лише невеликий набір відсутніх фраз, а російська не довантажує нічого',
        'Английская версия сайта загружает меньше данных: вместо полного украинского словаря докачивается только небольшой набор недостающих фраз, а русская не докачивает ничего',
        'The English version of the site downloads less: instead of the full Ukrainian dictionary only a small set of missing phrases is fetched, and Russian fetches nothing extra'
      ),
      item(
        'improved',
        'Якщо номера немає в реєстрі, тепер пояснюємо чому: до якої дати в даних є номери, дата останнього запису реєстру, можливі причини (авто до 2013 року, після прибирання номерів, відновлення номера за VIN, розшук і аукціони) та посилання на розділи, де можна прочитати більше.',
        'Если номера нет в реестре, теперь объясняем почему: до какой даты в данных есть номера, дата последней записи реестра, возможные причины (авто до 2013 года, после удаления номеров, восстановление номера по VIN, розыск и аукционы) и ссылки на разделы, где можно прочитать больше.',
        'When a plate is not in the registry we now explain why: the date up to which plates are in the data, the date of the registry last record, the likely reasons (a vehicle from before 2013, registered after plates were removed, restoring a plate from the VIN, wanted lists and auctions) and links to the sections where you can read more.'
      ),
      item(
        'improved',
        'Головне фото авто на повільному зв’язку з’являється швидше: воно завантажується у розмірі, що відповідає екрану телефона, а не у найбільшому.',
        'Главное фото авто на медленной связи появляется быстрее: оно загружается в размере, подходящем экрану телефона, а не в самом большом.',
        'The main vehicle photo appears sooner on a slow connection: it loads at a size that fits a phone screen instead of the largest one.'
      ),
      item(
        'improved',
        'Сторінка авто економить близько 2 МБ трафіку: мініатюри фото під головним знімком більше не завантажуються у повному розмірі.',
        'Страница авто экономит около 2 МБ трафика: миниатюры фото под главным снимком больше не загружаются в полном размере.',
        'The vehicle page saves about 2 MB of data: the photo thumbnails under the main picture no longer download at full size.'
      ),
      item(
        'improved',
        'Сторінка «Що нового» відкривається швидше: історія змін завантажується по місяцях, лише коли ви розгортаєте місяць.',
        'Страница «Что нового» открывается быстрее: история изменений загружается по месяцам, только когда вы разворачиваете месяц.',
        'The “What’s new” page opens faster: the change log loads one month at a time, only when you expand a month.'
      ),
      item(
        'improved',
        'Сторінка авто на повільному зв’язку з’являється швидше: службові скрипти моніторингу завантажуються після першого показу.',
        'Страница авто на медленной связи появляется быстрее: служебные скрипты мониторинга загружаются после первого показа.',
        'The vehicle page appears sooner on a slow connection: monitoring scripts now load after the first paint.'
      ),
      item(
        'improved',
        'Англомовна версія на повільному зв’язку завантажується швидше: резервний словник підтягується після показу сторінки.',
        'Англоязычная версия на медленной связи загружается быстрее: резервный словарь подгружается после показа страницы.',
        'The English version loads faster on a slow connection: the fallback dictionary now loads after the page is shown.'
      )
    ]
  },
  {
    date: '2026-11-19',
    version: 'v2.1417',
    items: [
      item(
        'improved',
        'Поки сторінка авто завантажується, замість порожнього місця показуються заготовки (фото, мініатюри, картка, кнопки пошуку): сторінка більше не «стрибає».',
        'Пока страница авто загружается, вместо пустого места показываются заготовки (фото, миниатюры, карточка, кнопки поиска): страница больше не «прыгает».',
        'While the vehicle page loads, placeholders (photo, thumbnails, card, search buttons) hold the space instead of a blank area: the page no longer jumps.'
      ),
      item(
        'improved',
        'Чипи в картці авто згортаються до трьох рядків із кнопкою «Показати більше» на всіх екранах, не лише на телефоні.',
        'Чипы в карточке авто сворачиваются до трёх рядов с кнопкой «Показать больше» на всех экранах, не только на телефоне.',
        'The chips in the vehicle card collapse to three rows with a "Show more" button on every screen size, not only on phones.'
      ),
      item(
        'improved',
        'Сторінка авто завантажується швидше: головне фото не чекає на решту знімків, мініатюри легші й вантажаться після нього, а чипи не зсувають картку.',
        'Страница авто загружается быстрее: главное фото не ждёт остальные снимки, миниатюры легче и грузятся после него, а чипы не сдвигают карточку.',
        'The vehicle page loads faster: the main photo no longer waits for the other shots, thumbnails are lighter and load after it, and the chips no longer push the card down.'
      ),
      item(
        'improved',
        'Безпека: додані заголовки Cross-Origin-Opener-Policy та Origin-Agent-Cluster, суворіша політика CSP (поки в режимі звітів).',
        'Безопасность: добавлены заголовки Cross-Origin-Opener-Policy и Origin-Agent-Cluster, более строгая политика CSP (пока в режиме отчётов).',
        'Security: added Cross-Origin-Opener-Policy and Origin-Agent-Cluster headers and a stricter CSP (still report-only).'
      ),
      item(
        'fix',
        '3D-моделі (Sketchfab) тепер можуть користуватися датчиками руху пристрою; вхід через Google ініціалізується один раз.',
        '3D-модели (Sketchfab) теперь могут пользоваться датчиками движения устройства; вход через Google инициализируется один раз.',
        '3D models (Sketchfab) can now use the device motion sensors; Google sign-in is initialised only once.'
      )
    ]
  },
  {
    date: '2026-11-18',
    version: 'v2.1382',
    items: [
      item(
        'improved',
        'Безпека: сервер тепер приймає трафік лише через Cloudflare, відкритий тільки порт 443; браузери отримують стиснення Brotli.',
        'Безопасность: сервер теперь принимает трафик только через Cloudflare, открыт только порт 443; браузеры получают сжатие Brotli.',
        'Security: the server now accepts traffic only through Cloudflare and only port 443 is open; browsers get Brotli compression.'
      ),
      item(
        'improved',
        'Сторінка «Про застосунок»: нові джерела (exifr, ONNX Runtime Web, Contabo), опис безпеки та оновлений план розвитку.',
        'Страница «О приложении»: новые источники (exifr, ONNX Runtime Web, Contabo), описание безопасности и обновлённый план развития.',
        'About page: new sources (exifr, ONNX Runtime Web, Contabo), a security entry and the updated roadmap description.'
      ),
      item(
        'improved',
        'Сторінка «Функції»: єдиний список «Що далі» з позначками (заплановано, ідея, вивчаємо), посилання на «Коротко про можливості» та обговорення.',
        'Страница «Функции»: единый список «Что дальше» с пометками (запланировано, идея, изучаем), ссылки на «Коротко о возможностях» и обсуждение.',
        'Features page: one "What is next" list with Planned / Idea / Researching chips, plus links to "At a glance" and the discussion page.'
      ),
      item(
        'improved',
        'Гра «Тест-драйв»: нахил телефона вперед/назад піднімає або опускає камеру і змінює поле зору - видно трафік перед авто; кредит рушія і на сторінці гри.',
        'Игра «Тест-драйв»: наклон телефона вперед/назад поднимает или опускает камеру и меняет поле зрения - виден трафик перед авто; кредит движка и на странице игры.',
        'Test-drive game: tilting the phone forward/back raises or lowers the camera and changes the field of view, so traffic ahead stays visible; the engine credit is on the game page too.'
      )
    ]
  },
  {
    date: '2026-11-17',
    version: 'v2.1360',
    items: [
      item(
        'improved',
        'Швидший старт: основний скрипт сайту зменшено зі 184 до 114 КБ, читання EXIF підвантажується лише для фото; офлайн-переклад більше не тягне рушій з CDN.',
        'Быстрее старт: основной скрипт сайта уменьшен со 184 до 114 КБ, чтение EXIF подгружается только для фото; офлайн-перевод больше не тянет движок из CDN.',
        'Faster start: the main script shrank from 184 to 114 KB, EXIF reading loads only for photos, and on-device translation no longer pulls its engine from a CDN.'
      ),
      item(
        'fix',
        'Пошук за VIN: якщо NHTSA недоступний, але VIN є в нашому реєстрі, показуємо записи реєстру замість помилки.',
        'Поиск по VIN: если NHTSA недоступен, но VIN есть в нашем реестре, показываем записи реестра вместо ошибки.',
        'VIN lookup: when NHTSA is down but the VIN is in our registry, the registry rows are shown instead of an error.'
      ),
      item(
        'fix',
        'Офлайн: головна не показує безкінечні скелети статистики, а відсутній логотип не дає помилку.',
        'Офлайн: главная не показывает бесконечные скелеты статистики, а отсутствующий логотип не даёт ошибку.',
        'Offline: the home page no longer shows endless stats skeletons and a missing logo no longer errors.'
      ),
      item(
        'fix',
        'Пошук за фото знову показує дату зйомки та місце (GPS) з EXIF фото.',
        'Поиск по фото снова показывает дату съёмки и место (GPS) из EXIF фото.',
        'Photo search shows the capture date and place (GPS) from the photo EXIF again.'
      ),
      item(
        'fix',
        'Адреса /cars/ зі слешем у кінці більше не шукає "номер" CARS і не дає помилку 404 в мережі.',
        'Адрес /cars/ со слешем в конце больше не ищет "номер" CARS и не даёт ошибку 404 в сети.',
        'The /cars/ address with a trailing slash no longer looks up a "plate" named CARS and no longer logs a 404.'
      ),
      item(
        'fix',
        'Тривоги: фон сторінок тепер малює області тими самими кольорами, що й мапа /alarms - жовтий і червоний рівні.',
        'Тревоги: фон страниц теперь рисует области теми же цветами, что и карта /alarms - жёлтый и красный уровни.',
        'Alarms: the page background now paints oblasts in the same colors as the /alarms map - yellow and red levels.'
      )
    ]
  },
  {
    date: '2026-11-16',
    version: 'v2.1348',
    items: [
      item(
        'fix',
        'Розміри й паркування: мікроавтобуси на кшталт Sprinter, що в реєстрі записані як автобус, тепер мають креслення - відсутні габарити прогнозуються як для фургона.',
        'Размеры и парковка: микроавтобусы вроде Sprinter, записанные в реестре как автобус, теперь получают чертёж - недостающие габариты прогнозируются как для фургона.',
        'Size & parking: Sprinter-class minibuses filed as a bus in the registry now get a drawing - the missing dimensions are forecast as for a van.'
      ),
      item(
        'improved',
        'Вкладка «Креслення»: опис над кресленням отримав той самий фон, що й рядки під ним.',
        'Вкладка «Чертёж»: описание над чертежом получило тот же фон, что и строки под ним.',
        'Drawing tab: the description above the drawing has the same background as the rows below it.'
      )
    ]
  },
  {
    date: '2026-11-14',
    version: 'v2.1345',
    items: [
      item(
        'fix',
        'Фото з кількома номерами: обране авто тепер підсвічується на фото і в списку «Також знайдено», решта тьмяніє.',
        'Фото с несколькими номерами: выбранное авто теперь подсвечивается на фото и в списке «Также найдено», остальные тускнеют.',
        'Photos with several plates: the chosen car is now highlighted in the photo and in the "Also found" list, the rest fade.'
      ),
      item(
        'improved',
        'Мініатюри під фото з’являються і зникають плавно, без різкого зсуву сторінки.',
        'Миниатюры под фото появляются и исчезают плавно, без резкого сдвига страницы.',
        'The thumbnails under the photo appear and disappear smoothly, without the page jumping.'
      ),
      item(
        'new',
        'Картка авто: зведена оцінка краш-тестів зірками (Euro NCAP, NHTSA, JNCAP, KNCAP) - підвантажується у фоні.',
        'Карточка авто: сводная оценка краш-тестов звёздами (Euro NCAP, NHTSA, JNCAP, KNCAP) - подгружается в фоне.',
        'Car card: a combined crash-test star rating (Euro NCAP, NHTSA, JNCAP, KNCAP), loaded in the background.'
      ),
      item(
        'improved',
        'Викиди: порівняння з тим, скільки CO₂ людина видихає за добу (на 100 км).',
        'Выбросы: сравнение с тем, сколько CO₂ человек выдыхает за сутки (на 100 км).',
        'Emissions: a comparison with the CO₂ a person exhales in a day (per 100 km).'
      ),
      item(
        'improved',
        'Сторінка «Встановлення»: прибрано розділ з практиками для PWA (для розробників, не для користувачів).',
        'Страница «Установка»: убран раздел с практиками для PWA (для разработчиков, не для пользователей).',
        'Install page: removed the PWA best-practices section (aimed at developers, not users).'
      ),
      item(
        'improved',
        'Про застосунок: короткий опис кожної можливості, зокрема приватності без банера cookie, зведених зірок краш-тестів і порівняння CO₂ з диханням людини.',
        'О приложении: краткое описание каждой возможности, включая приватность без баннера cookie, сводные звёзды краш-тестов и сравнение CO₂ с дыханием человека.',
        'About page: a short entry for every feature, including privacy without a cookie banner, the combined crash-test stars and the CO₂ vs human breathing comparison.'
      )
    ]
  },
  {
    date: '2026-11-13',
    version: 'v2.1222',
    items: [
      item(
        'improved',
        'Сторінка «Стан даних»: історія оновлень тепер показує всі джерела з датою останнього оновлення, а не лише останні запуски.',
        'Страница «Состояние данных»: история обновлений теперь показывает все источники с датой последнего обновления, а не только последние запуски.',
        'Data status page: the update history now lists every source with its last update date, not just the latest runs.'
      ),
      item(
        'improved',
        'Аналітика без cookie: статистика використання йде в хмару PostHog ЄС, на вашому пристрої нічого не зберігається, тому банер cookie не потрібен.',
        'Аналитика без cookie: статистика использования идёт в облако PostHog ЕС, на вашем устройстве ничего не сохраняется, поэтому баннер cookie не нужен.',
        'Cookieless analytics: usage statistics go to the PostHog EU cloud and nothing is stored on your device, so no cookie banner is needed.'
      ),
      item(
        'improved',
        'Мапа регіону, коментарі Disqus, сервіси поблизу (Google Maps) і спільні розкладки фону з картою чи трансляцією завантажуються лише після вашого кліку; у вікні відео є примітка про сторонній сервіс.',
        'Карта региона, комментарии Disqus, сервисы рядом (Google Maps) и общие раскладки фона с картой или трансляцией загружаются только после вашего клика; в окне видео есть примечание о стороннем сервисе.',
        'The region map, Disqus comments, nearby services (Google Maps) and shared background layouts with a map or stream load only after your click; the video window carries a third-party note.'
      ),
      item(
        'improved',
        'Видалений обліковий запис стирається через 14 днів пільгового періоду, а з резервних копій зникає ще за 14 днів; дані облікових записів більше не потрапляють у довгі повні копії.',
        'Удалённый аккаунт стирается через 14 дней льготного периода, а из резервных копий исчезает ещё за 14 дней; данные аккаунтов больше не попадают в долгие полные копии.',
        'A deleted account is erased after a 14-day grace period and leaves backups 14 days later; account data no longer goes into the long-lived full backups.'
      ),
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
  }
]
