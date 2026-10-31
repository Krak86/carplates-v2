export const RELEASE_GROUPS = ['new', 'improved', 'data', 'fix'] as const
export type ReleaseGroup = (typeof RELEASE_GROUPS)[number]

export const RELEASE_LANGS = ['ua', 'ru', 'en'] as const
export type ReleaseLang = (typeof RELEASE_LANGS)[number]

export type ReleaseItem = { group: ReleaseGroup } & Record<ReleaseLang, string>

export type ReleaseDay = { date: string; items: readonly ReleaseItem[] }

const item = (group: ReleaseGroup, ua: string, ru: string, en: string): ReleaseItem => ({ group, ua, ru, en })

/**
 * Brief change log, one entry per working day. Add the newest day at the top, keep items to one line each.
 * Written from the git history; the page sorts by date, so order here is not significant.
 */
export const RELEASES: readonly ReleaseDay[] = [
  {
    date: '2026-10-31',
    items: [
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
        'Ширші картки результатів; мова за замовчуванням - українська',
        'Более широкие карточки результатов; язык по умолчанию - украинский',
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
        'Макет реєстру 2026 року: номер може бути порожнім, ключ - VIN',
        'Макет реестра 2026 года: номер может быть пустым, ключ - VIN',
        '2026 registry layout: nullable plate, rows keyed on VIN'
      )
    ]
  }
]
