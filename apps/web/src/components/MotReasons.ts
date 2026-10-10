/**
 * Plain-language names for the most frequent MOT reasons, by reason code (`group/item/fault`, see `mot-lookup.ts`):
 * [English, Ukrainian, Russian]. Written from the real aggregate (the 80 most frequent of 2,022 codes, ~90 % of all
 * fail + advisory counts); every other reason is shown in DVSA's English wording (`lang="en"`), never machine-translated.
 */
const LABELS: Readonly<Record<string, readonly [string, string, string]>> = {
  'tyres/tread-depth/tread-depth-below-requirements-of-1-6mm': [
    'Tyre tread below the legal minimum (1.6 mm)',
    'Протектор шин нижче дозволеного мінімуму (1,6 мм)',
    'Протектор шин ниже допустимого минимума (1,6 мм)'
  ],
  'tyres/condition/has-a-tear-caused-by-separation-or-partial-failure-of-its-structure': [
    'Tyre tear or damaged structure',
    'Розрив або пошкодження каркасу шини',
    'Разрыв или повреждение каркаса шины'
  ],
  'brakes/brake-discs/in-such-a-condition-that-it-is-seriously-weakened': [
    'Brake discs seriously worn or weakened',
    'Гальмівні диски сильно зношені',
    'Тормозные диски сильно изношены'
  ],
  'suspension/pins-and-bushes/pin-or-bush-excessively-worn': [
    'Suspension pins and bushes worn',
    'Зношені пальці та сайлентблоки підвіски',
    'Изношены пальцы и сайлентблоки подвески'
  ],
  'brakes/brake-pads/less-than-1-5-mm-thick': [
    'Brake pads too thin (under 1.5 mm)',
    'Гальмівні колодки зношені (тонші за 1,5 мм)',
    'Тормозные колодки изношены (тоньше 1,5 мм)'
  ],
  'brakes/rigid-brake-pipes/excessively-corroded': [
    'Rigid brake pipes corroded',
    'Корозія жорстких гальмівних трубок',
    'Коррозия жёстких тормозных трубок'
  ],
  'exhaust/engine-oil-leaks/leaking-excessively-from-engine': [
    'Engine oil leak',
    'Витік моторної оливи',
    'Течь моторного масла'
  ],
  'suspension/coil-spring/corroded-so-that-its-cross-sectional-area-is-reduced-and-seriously-weakened': [
    'Coil spring corroded and weakened',
    'Пружина підвіски послаблена корозією',
    'Пружина подвески ослаблена коррозией'
  ],
  'suspension/shock-absorbers/has-a-serious-fluid-leak': [
    'Shock absorber leaking fluid',
    'Амортизатор: витік рідини',
    'Амортизатор: течь жидкости'
  ],
  'suspension/ball-joint/ball-joint-excessively-worn': [
    'Ball joint worn',
    'Зношена кульова опора',
    'Изношена шаровая опора'
  ],
  'brakes/brake-discs/significantly-and-obviously-worn': [
    'Brake discs significantly worn',
    'Гальмівні диски помітно зношені',
    'Тормозные диски заметно изношены'
  ],
  'identification/registration-plates/inscription-illegible': [
    'Number plate illegible',
    'Номерний знак нечитабельний',
    'Номерной знак нечитаем'
  ],
  'body/exhaust-system/has-a-major-leak-of-exhaust-gases': [
    'Major exhaust gas leak',
    'Значний витік вихлопних газів',
    'Значительная утечка выхлопных газов'
  ],
  'brakes/service-brake-performance/excessively-binding': ['Brakes binding', 'Гальма заїдають', 'Тормоза заедают'],
  'tyres/condition/has-a-cut-in-excess-of-the-requirements-deep-enough-to-reach-the-ply-or-cords': [
    'Tyre cut reaching the cords',
    'Порізана шина — до корду',
    'Порез шины до корда'
  ],
  'other/non-component-advisories/child-seat-fitted-not-allowing-full-inspection-of-adult-belt': [
    'Child seat blocks seat belt inspection',
    'Дитяче крісло заважає перевірити ремінь безпеки',
    'Детское кресло мешает проверке ремня безопасности'
  ],
  'tyres/tread-depth/tread-pattern-not-visible-over-the-whole-tread-area-when-minimum-depth-required-is-1-0mm': [
    'Tyre tread pattern not visible (1.0 mm minimum)',
    'Малюнок протектора не видно (мінімум 1,0 мм)',
    'Рисунок протектора не виден (минимум 1,0 мм)'
  ],
  'suspension/coil-spring/fractured-or-broken': [
    'Coil spring broken',
    'Зламана пружина підвіски',
    'Сломана пружина подвески'
  ],
  'suspension/linkage-ball-joints/ball-joint-excessively-worn': [
    'Suspension arm ball joint worn',
    'Зношена кульова опора важеля',
    'Изношена шаровая опора рычага'
  ],
  'steering/track-rod-end/ball-joint-has-excessive-play': [
    'Track rod end play',
    'Люфт рульового наконечника',
    'Люфт рулевого наконечника'
  ],
  'other/non-component-advisories/nail-in-tyre': ['Nail in tyre', 'Цвях у шині', 'Гвоздь в шине'],
  'suspension/component-mounting-prescribed-areas/prescribed-area-excessively-corroded-significantly-reducing-structural-strength':
    [
      'Corrosion in suspension mounting area',
      'Корозія в зоні кріплення підвіски',
      'Коррозия в зоне крепления подвески'
    ],
  'lamps/position-lamp/not-working': [
    'Position (side) lamp not working',
    'Габаритний ліхтар не працює',
    'Габаритный фонарь не работает'
  ],
  'visibility/wipers/does-not-clear-the-windscreen-effectively': [
    'Wipers do not clear the windscreen',
    'Двірники погано очищують скло',
    'Дворники плохо очищают стекло'
  ],
  'lamps/individual-direction-indicators/incorrect-colour': [
    'Direction indicator wrong colour',
    'Покажчик повороту невірного кольору',
    'Указатель поворота неверного цвета'
  ],
  'other/non-component-advisories/play-in-steering-rack-inner-joint-s': [
    'Play in steering rack inner joints',
    'Люфт внутрішніх шарнірів рульової рейки',
    'Люфт внутренних шарниров рулевой рейки'
  ],
  'suspension/sub-frame/corroded-and-seriously-weakened': [
    'Sub-frame corroded',
    'Корозія підрамника',
    'Коррозия подрамника'
  ],
  'suspension/suspension-arm/corroded-and-seriously-weakened': [
    'Suspension arm corroded',
    'Корозія важеля підвіски',
    'Коррозия рычага подвески'
  ],
  'brakes/flexible-brake-hoses/ferrule-excessively-corroded': [
    'Brake hose end fitting corroded',
    'Корозія наконечника гальмівного шланга',
    'Коррозия наконечника тормозного шланга'
  ],
  'tyres/condition/has-ply-or-cords-exposed': ['Tyre cords exposed', 'Видно корд шини', 'Виден корд шины'],
  'brakes/service-brake-performance/excessively-fluctuating': [
    'Brake force fluctuating',
    'Нерівномірна сила гальмування',
    'Неравномерная сила торможения'
  ],
  'lamps/stop-lamp/not-working': ['Brake (stop) lamp not working', 'Стоп-сигнал не працює', 'Стоп-сигнал не работает'],
  'body/joints/constant-velocity-boot-split-or-insecure-no-longer-prevents-the-ingress-of-dirt': [
    'CV joint boot split',
    'Порваний пильовик ШРУСа',
    'Порван пыльник ШРУСа'
  ],
  'body/exhaust-system/system-insecure': [
    'Exhaust system insecure',
    'Вихлопна система погано закріплена',
    'Выхлопная система плохо закреплена'
  ],
  'wheels/condition/badly-distorted': [
    'Wheel badly distorted',
    'Колісний диск сильно деформований',
    'Колёсный диск сильно деформирован'
  ],
  'lamps/headlamp-aim/projected-beam-image-is-obviously-incorrect': [
    'Headlamp aim obviously wrong',
    'Фари явно розрегульовані',
    'Фары явно разрегулированы'
  ],
  'lamps/headlamp/has-a-product-on-the-lens-so-that-the-light-output-is-severely-reduced': [
    'Headlamp lens covered or clouded',
    'Лінза фари забруднена або матова',
    'Линза фары загрязнена или матовая'
  ],
  'tyres/condition/has-a-bulge-caused-by-separation-or-partial-failure-of-its-structure': [
    'Tyre bulge',
    'Здуття на шині',
    'Вздутие на шине'
  ],
  'brakes/rbt-sp/efficiency-below-requirements': [
    'Brake efficiency below requirements',
    'Ефективність гальм нижча за норму',
    'Эффективность тормозов ниже нормы'
  ],
  'exhaust/malfunction-indicator-lamp/inoperative-or-indicates-a-malfunction': [
    'Engine warning lamp (emissions fault)',
    'Індикатор несправності двигуна (викиди)',
    'Индикатор неисправности двигателя (выбросы)'
  ],
  'suspension/wheel-bearings/has-excessive-play': [
    'Wheel bearing play',
    'Люфт підшипника маточини',
    'Люфт ступичного подшипника'
  ],
  'brakes/flexible-brake-hoses/excessively-deteriorated': [
    'Flexible brake hose deteriorated',
    'Зношений гнучкий гальмівний шланг',
    'Изношен гибкий тормозной шланг'
  ],
  'lamps/headlamp/not-working-on-dipped-beam': [
    'Headlamp (dipped beam) not working',
    'Ближнє світло не працює',
    'Ближний свет не работает'
  ],
  'suspension/linkage-pins-and-bushes/pin-or-bush-excessively-worn': [
    'Suspension linkage pins and bushes worn',
    'Зношені пальці та втулки важелів',
    'Изношены пальцы и втулки рычагов'
  ],
  'body/chassis-condition/corroded-to-the-extent-that-the-rigidity-of-the-assembly-is-significantly-reduced': [
    'Chassis corroded, rigidity reduced',
    'Корозія шасі, жорсткість знижена',
    'Коррозия шасси, жёсткость снижена'
  ],
  'brakes/service-brake-imbalance/across-an-axle': [
    'Brake imbalance across the axle',
    'Різна сила гальмування лівого і правого коліс',
    'Разная сила торможения левого и правого колёс'
  ],
  'suspension/ball-joint-dust-cover/ball-joint-dust-cover-no-longer-prevents-the-ingress-of-dirt': [
    'Ball joint dust cover torn',
    'Пошкоджений пильовик кульової опори',
    'Повреждён пыльник шаровой опоры'
  ],
  'visibility/washers/provides-insufficient-washer-liquid': [
    'Washer fluid insufficient',
    'Недостатньо рідини омивача',
    'Недостаточно жидкости омывателя'
  ],
  'lamps/registration-plate-lamp-s/inoperative-in-the-case-of-a-single-lamp-or-all-lamps': [
    'Number plate lamp not working',
    'Підсвітка номерного знака не працює',
    'Подсветка номерного знака не работает'
  ],
  'body/integral-vehicle-structure-condition/corroded-to-the-extent-that-the-rigidity-of-the-assembly-is-significantly-reduced':
    ['Body structure corroded', 'Корозія несучої конструкції кузова', 'Коррозия несущей конструкции кузова'],
  'other/non-component-advisories/items-removed-from-drivers-view-prior-to-test': [
    "Items removed from the driver's view before the test",
    'Предмети прибрано з поля зору водія перед тестом',
    'Предметы убраны из поля зрения водителя перед тестом'
  ],
  'suspension/wheel-bearings/rough-when-rotated': [
    'Wheel bearing rough or noisy',
    'Підшипник маточини шумить',
    'Ступичный подшипник шумит'
  ],
  'suspension/swivel-pins-and-bushes/swivel-pin-and-or-bush-excessively-worn': [
    'Swivel pin or bush worn',
    'Зношений поворотний шкворінь або втулка',
    'Изношен поворотный шкворень или втулка'
  ],
  'suspension/shock-absorbers/has-an-excessively-worn-bush': [
    'Shock absorber bush worn',
    'Зношена втулка амортизатора',
    'Изношена втулка амортизатора'
  ],
  'exhaust/transmission-oil-leaks/leaking-excessively-from-transmission': [
    'Gearbox oil leak',
    'Витік оливи з коробки передач',
    'Течь масла из коробки передач'
  ],
  'suspension/linkage-ball-joint-dust-cover/ball-joint-dust-cover-no-longer-prevents-the-ingress-of-dirt': [
    'Suspension arm ball joint dust cover torn',
    'Пошкоджений пильовик кульової опори важеля',
    'Повреждён пыльник шаровой опоры рычага'
  ],
  'lamps/headlamp-aim/too-low': ['Headlamp aim too low', 'Фари світять занизько', 'Фары светят слишком низко'],
  'visibility/washers/not-working': ['Washers not working', 'Омивач не працює', 'Омыватель не работает'],
  'brakes/parking-brake-performance/inoperative-on-one-side': [
    'Parking brake not working on one side',
    'Ручне гальмо не працює з одного боку',
    'Ручной тормоз не работает с одной стороны'
  ],
  'seatbelts/prescribed-areas/prescribed-area-strength-or-continuity-significantly-reduced': [
    'Seat belt anchorage area corroded',
    'Корозія в зоні кріплення ременів безпеки',
    'Коррозия в зоне креплений ремней безопасности'
  ],
  'seatbelts/condition/webbing-significantly-weakened': [
    'Seat belt webbing weakened',
    'Ослаблена стрічка ременя безпеки',
    'Ослаблена лента ремня безопасности'
  ],
  'seatbelts/srs-malfunction-indicator-lamp/warning-lamp-indicates-a-fault': [
    'Airbag (SRS) warning lamp fault',
    'Несправність індикатора подушок безпеки (SRS)',
    'Неисправность индикатора подушек безопасности (SRS)'
  ],
  'exhaust/catalyst-emissions/lambda-reading-after-2nd-fast-idle-outside-specified-limits': [
    'Catalyst emissions (lambda) out of limits',
    'Викиди каталізатора (лямбда) поза нормою',
    'Выбросы катализатора (лямбда) вне нормы'
  ],
  'suspension/shock-absorbers/damaged-to-the-extent-that-it-does-not-function': [
    'Shock absorber damaged, not working',
    'Амортизатор пошкоджений і не працює',
    'Амортизатор повреждён и не работает'
  ],
  'suspension/shock-absorbers/has-negligible-damping-effect': [
    'Shock absorber barely damping',
    'Амортизатор майже не гасить коливання',
    'Амортизатор почти не гасит колебания'
  ],
  'lamps/stop-lamp/with-a-multiple-light-source-more-than-1-2-not-functioning': [
    'Stop lamp: more than half of the bulbs out',
    'Стоп-сигнал: понад половина ламп не працює',
    'Стоп-сигнал: больше половины ламп не работает'
  ],
  'lamps/rear-fog-lamp/not-working': [
    'Rear fog lamp not working',
    'Задній протитуманний ліхтар не працює',
    'Задний противотуманный фонарь не работает'
  ],
  'lamps/headlamp-aim/too-high': ['Headlamp aim too high', 'Фари світять зависоко', 'Фары светят слишком высоко'],
  'suspension/sub-frame-mounting-prescribed-areas/prescribed-area-excessively-corroded-significantly-reducing-structural-strength':
    ['Corrosion at sub-frame mounting', 'Корозія кріплення підрамника', 'Коррозия крепления подрамника'],
  'brakes/anti-lock-braking-system/warning-lamp-indicates-an-abs-fault': [
    'ABS warning lamp on',
    'Горить індикатор ABS',
    'Горит индикатор ABS'
  ],
  'lamps/side-repeaters/not-working': [
    'Side repeater lamp not working',
    'Бічний повторювач не працює',
    'Боковой повторитель не работает'
  ],
  'body/integral-vehicle-structure-condition/or-chassis-has-excessive-corrosion-seriously-affecting-its-strength-within-30cm-of-a-body-mounting':
    ['Chassis corroded near body mounting', 'Корозія шасі біля кріплення кузова', 'Коррозия шасси у крепления кузова'],
  'brakes/rbt-sp/efficiency-less-than-50-of-the-required-value': [
    'Brake efficiency under 50 % of required',
    'Ефективність гальм менше 50 % норми',
    'Эффективность тормозов менее 50 % нормы'
  ],
  'lamps/horn/not-working': ['Horn not working', 'Звуковий сигнал не працює', 'Звуковой сигнал не работает'],
  'suspension/macpherson-strut/corroded-and-seriously-weakened': [
    'Strut corroded and weakened',
    'Корозія амортизаційної стійки',
    'Коррозия амортизаторной стойки'
  ],
  'other/non-component-advisories/coolant-leak': [
    'Coolant leak',
    'Витік охолоджувальної рідини',
    'Течь охлаждающей жидкости'
  ],
  'wheels/attachment/fixing-missing': [
    'Wheel fixing (nut or bolt) missing',
    'Відсутнє кріплення колеса (гайка або болт)',
    'Отсутствует крепление колеса (гайка или болт)'
  ],
  'lamps/side-repeaters/incorrect-colour': [
    'Side repeater lamp wrong colour',
    'Бічний повторювач невірного кольору',
    'Боковой повторитель неверного цвета'
  ],
  'other/non-component-advisories/vehicles-internal-headlight-adjuster-altered-to-recheck-lights': [
    'Headlight adjuster altered for the re-check',
    'Регулятор фар змінили для повторної перевірки',
    'Регулятор фар изменён для повторной проверки'
  ],
  'exhaust/emissions-not-tested/not-tested': [
    'Emissions not tested',
    'Викиди не перевірялись',
    'Выбросы не проверялись'
  ]
}

const LANG_INDEX: Readonly<Record<string, number>> = { en: 0, ua: 1, ru: 2 }

/** Our name for a reason in the UI language; null when the code is not among the translated ones. */
export function reasonLabel(code: string, lang: string): string | null {
  return LABELS[code]?.[LANG_INDEX[lang] ?? 0] ?? null
}
