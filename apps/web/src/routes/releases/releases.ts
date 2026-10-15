import type { ReleaseDay, ReleaseGroup, ReleaseItem } from '@/routes/releases/types'

const item = (group: ReleaseGroup, ua: string, ru: string, en: string): ReleaseItem => ({ group, ua, ru, en })

/**
 * Brief change log, one entry per working day. Add the newest day at the top, keep items to one line each.
 * Written from the git history; the page sorts by date, so order here is not significant.
 */
export const RELEASES: readonly ReleaseDay[] = [
  {
    date: '2026-10-15',
    items: [
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
        'Секції завантажуються при розгортанні, окремі чанки мов, WebP-логотипи — швидше відкриття',
        'Секции загружаются при раскрытии, отдельные чанки языков, WebP-логотипы — быстрее открытие',
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
    items: [
      item(
        'new',
        'Краш-тести C-NCAP, KNCAP та IIHS (разом із Euro NCAP, JNCAP, NHTSA — шість джерел)',
        'Краш-тесты C-NCAP, KNCAP и IIHS (вместе с Euro NCAP, JNCAP, NHTSA — шесть источников)',
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
        'Ширші картки результатів; мова за замовчуванням — українська',
        'Более широкие карточки результатов; язык по умолчанию — украинский',
        'Wider result cards; Ukrainian is the default language'
      )
    ]
  },
  {
    date: '2026-09-22',
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
    items: [
      item(
        'new',
        'Перший реліз: пошук авто за номером і VIN (реєстр data.gov.ua, розшифровка VIN через NHTSA)',
        'Первый релиз: поиск авто по номеру и VIN (реестр data.gov.ua, расшифровка VIN через NHTSA)',
        'First release: vehicle lookup by plate and VIN (data.gov.ua registry, NHTSA VIN decoding)'
      ),
      item(
        'data',
        'Макет реєстру 2026 року: номер може бути порожнім, ключ — VIN',
        'Макет реестра 2026 года: номер может быть пустым, ключ — VIN',
        '2026 registry layout: nullable plate, rows keyed on VIN'
      )
    ]
  }
]
