import type { CrashSource } from '@carplates/shared'

import type { L10n } from '@/routes/read/types'

export const WHAT_IS_TEST: L10n = {
  ua: 'Краш-тест - це контрольне зіткнення, після якого незалежна програма ставить авто оцінку за захист пасажирів. Програм кілька, і кожна має власні тести та шкалу, тому зірки одної не дорівнюють відсоткам іншої. Ми приводимо кожну оцінку до шкали 0–100 і усереднюємо ті програми, що тестували покоління цього авто. Це приблизне порівняння, а не офіційний рейтинг.',
  ru: 'Краш-тест - это контрольное столкновение, после которого независимая программа ставит авто оценку за защиту пассажиров. Программ несколько, и у каждой свои тесты и шкала, поэтому звёзды одной не равны процентам другой. Мы приводим каждую оценку к шкале 0–100 и усредняем те программы, что тестировали поколение этого авто. Это приблизительное сравнение, а не официальный рейтинг.',
  en: 'A crash test is a controlled collision after which an independent programme grades how well the car protects its occupants. There are several programmes, each with its own tests and scale, so one’s stars are not another’s percentages. We bring every rating to a 0–100 scale and average the programmes that tested that car’s generation. It is a rough comparison, not an official rating.'
}

export type Programme = { source: CrashSource; scale: L10n; text: L10n }

export const PROGRAMMES: readonly Programme[] = [
  {
    source: 'euroncap',
    scale: { ua: '0–5 зірок', ru: '0–5 звёзд', en: '0–5 stars' },
    text: {
      ua: 'Європейська програма: тестує захист дорослих і дітей, пішоходів та велосипедистів і системи допомоги водієві. Ми беремо зірки як є (5 зірок = 100).',
      ru: 'Европейская программа: тестирует защиту взрослых и детей, пешеходов и велосипедистов и системы помощи водителю. Мы берём звёзды как есть (5 звёзд = 100).',
      en: 'The European programme: it tests protection of adults and children, of pedestrians and cyclists, and the driver-assistance systems. We take the stars as they are (5 stars = 100).'
    }
  },
  {
    source: 'iihs',
    scale: { ua: 'Good … Poor', ru: 'Good … Poor', en: 'Good … Poor' },
    text: {
      ua: 'Американський інститут, що фінансується страховиками. Окремої загальної оцінки немає: ми беремо середнє за тестами на міцність кузова (фронтальні, боковий, дах, підголівники), Good = 100, Poor = 0.',
      ru: 'Американский институт, финансируемый страховщиками. Общей оценки нет: мы берём среднее по тестам прочности кузова (фронтальные, боковой, крыша, подголовники), Good = 100, Poor = 0.',
      en: 'The American institute funded by insurers. It has no overall number: we take the mean of its body-strength tests (front, side, roof, head restraints), Good = 100, Poor = 0.'
    }
  },
  {
    source: 'jncap',
    scale: { ua: 'відсотки / зірки', ru: 'проценты / звёзды', en: 'percent / stars' },
    text: {
      ua: 'Японська програма: загальний відсоток, а якщо його немає - зірки.',
      ru: 'Японская программа: общий процент, а если его нет - звёзды.',
      en: 'The Japanese programme: the overall percentage, or the stars when there is none.'
    }
  },
  {
    source: 'cncap',
    scale: { ua: 'відсотки', ru: 'проценты', en: 'percent' },
    text: {
      ua: 'Китайська програма. Порівнянні лише оцінки у відсотках (з 2018 року), старіші бали без фіксованого максимуму ми не враховуємо.',
      ru: 'Китайская программа. Сопоставимы только оценки в процентах (с 2018 года), более старые баллы без фиксированного максимума мы не учитываем.',
      en: 'The Chinese programme. Only the percentage scores (from 2018) are comparable; older point scores with no fixed maximum are left out.'
    }
  },
  {
    source: 'kncap',
    scale: { ua: 'бал / клас 1–5', ru: 'балл / класс 1–5', en: 'score / class 1–5' },
    text: {
      ua: 'Корейська програма: загальний бал, а за його відсутності - орієнтовний бал за класом.',
      ru: 'Корейская программа: общий балл, а при его отсутствии - ориентировочный балл по классу.',
      en: 'The Korean programme: the overall score, or an estimate from the class when it has none.'
    }
  }
]

export const COVERAGE_NOTE: L10n = {
  ua: 'Не оцінене авто не обов’язково небезпечне: його просто могли не тестувати. Багато авто, що їздять в Україні, збудовані для інших ринків або мають локальні назви, яких немає в таблицях програм.',
  ru: 'Неоценённое авто не обязательно опасно: его просто могли не тестировать. Многие авто, ездящие в Украине, собраны для других рынков или имеют локальные названия, которых нет в таблицах программ.',
  en: 'A car with no rating is not necessarily unsafe: it may simply never have been tested. Many cars on Ukrainian roads were built for other markets or carry local names that the programmes’ tables do not have.'
}

export const YEARS_NOTE: L10n = {
  ua: 'Рік - це рік випуску авто. Тести з часом посилюються, тому оцінка нового авто й оцінка 15-річного - це не одна й та сама планка.',
  ru: 'Год - это год выпуска авто. Тесты со временем ужесточаются, поэтому оценка нового авто и оценка 15-летнего - это не одна и та же планка.',
  en: 'The year is the car’s model year. Tests get stricter over time, so a new car’s grade and a 15-year-old car’s grade are not measured against the same bar.'
}

export const MODELS_NOTE: L10n = {
  ua: 'У списки потрапляють моделі, яких зареєстровано багато. Кілька моделей мають однакові 100: тоді вище стоїть та, що оцінена більшою кількістю програм, а далі - поширеніша.',
  ru: 'В списки попадают модели, которых зарегистрировано много. Несколько моделей имеют одинаковые 100: тогда выше стоит та, что оценена большим числом программ, а затем - более распространённая.',
  en: 'Only models with many registered cars are listed. Several models share a perfect 100; the one rated by more programmes ranks higher, then the more common one.'
}

export type Limit = { key: 'generation' | 'trim' | 'condition'; text: L10n }

export const LIMITS: readonly Limit[] = [
  {
    key: 'generation',
    text: {
      ua: 'Оцінка стосується покоління, яке тестували. Ми підбираємо найновішу оцінку, опубліковану не пізніше ніж через рік після року випуску авто, але стара й нова версії однієї моделі можуть різнитися.',
      ru: 'Оценка относится к тестировавшемуся поколению. Мы подбираем самую новую оценку, опубликованную не позже чем через год после года выпуска авто, но старая и новая версии одной модели могут отличаться.',
      en: 'A rating belongs to the generation that was tested. We pick the newest rating published no later than a year after the car’s model year, but an old and a new version of one model can differ.'
    }
  },
  {
    key: 'trim',
    text: {
      ua: 'Тестують конкретну комплектацію. Подушки, системи допомоги й навіть кузов на вашому авто можуть бути іншими, особливо якщо його збудовано для іншого ринку.',
      ru: 'Тестируют конкретную комплектацию. Подушки, системы помощи и даже кузов на вашем авто могут быть другими, особенно если оно собрано для другого рынка.',
      en: 'A specific trim is tested. The airbags, assistance systems and even the body of your car can be different, especially if it was built for another market.'
    }
  },
  {
    key: 'condition',
    text: {
      ua: 'Оцінка - про новий кузов у заводському стані. Вона нічого не каже про технічний стан, ремонт після ДТП чи знос конкретного авто.',
      ru: 'Оценка - про новый кузов в заводском состоянии. Она ничего не говорит о техническом состоянии, ремонте после ДТП или износе конкретного авто.',
      en: 'A rating describes a new body in factory condition. It says nothing about the technical state, a repair after a crash or the wear of one particular car.'
    }
  }
]
