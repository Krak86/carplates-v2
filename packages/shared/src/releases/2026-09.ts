import { item } from './core.js'
import type { ReleaseDay } from './core.js'

/** 2026-09: newest day first. */
export const DAYS: readonly ReleaseDay[] = [
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
