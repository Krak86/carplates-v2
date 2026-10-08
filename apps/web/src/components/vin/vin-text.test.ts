import { describe, it, expect } from 'vitest'
import type { TFunction } from 'i18next'

import ru from '@/i18n/ru.json'
import ua from '@/i18n/ua.json'
import { localizeLabel, localizeValue, vinSlug } from '@/components/vin/vin-text'

const dict = (json: Record<string, string>): TFunction =>
  ((key: string, opts?: { defaultValue?: string }) => json[key] ?? opts?.defaultValue ?? key) as unknown as TFunction

const tUa = dict(ua)
const tRu = dict(ru)

describe('vinSlug', () => {
  it('keeps " - " distinct from a plain space', () => {
    expect(vinSlug('Incomplete - Trailer Chassis')).not.toBe(vinSlug('Incomplete Trailer Chassis'))
    expect(vinSlug('Displacement (CC)')).toBe('displacement_cc')
  })
})

describe('localizeLabel', () => {
  it('shows the translation plus the English name, and English alone for en', () => {
    expect(localizeLabel(tUa, 'ua', 'Engine Number of Cylinders')).toEqual({
      text: 'Кількість циліндрів',
      en: 'Engine Number of Cylinders'
    })
    expect(localizeLabel(tUa, 'en', 'Make')).toEqual({ text: 'Make', en: null })
  })

  it('falls back to the NHTSA name for an unknown variable', () => {
    expect(localizeLabel(tUa, 'ua', 'Brand New Variable')).toEqual({
      text: 'Brand New Variable',
      en: 'Brand New Variable'
    })
  })
})

describe('localizeValue', () => {
  it('localizes units and keeps NHTSA rounding', () => {
    expect(localizeValue(tUa, 'ua', 'Displacement (CC)', '2998.83')).toEqual({ text: '2999 см³', en: '2999 cc' })
    expect(localizeValue(tRu, 'ru', 'Engine Brake (hp) From', '240').text).toBe('240 л.с.')
  })

  it('translates dictionary words and compounds, reusing the plate card fuel words', () => {
    expect(localizeValue(tUa, 'ua', 'Fuel Type - Primary', 'Gasoline')).toEqual({ text: 'Бензин', en: 'Gasoline' })
    expect(localizeValue(tUa, 'ua', 'Body Class', 'Coupe').text).toBe('Купе')
    expect(localizeValue(tUa, 'ua', 'Vehicle Type', 'PASSENGER CAR').text).toBe('Легковий автомобіль')
    expect(localizeValue(tUa, 'ua', 'Headlamp Light Source', 'Halogen, LED').text).toBe('Галогенні, Світлодіодні (LED)')
  })

  it('uses context overrides for words that mean different things', () => {
    expect(localizeValue(tUa, 'ua', 'Antilock Braking System (ABS)', 'Standard').text).toBe('Серійно')
    expect(localizeValue(tUa, 'ua', 'Wheelbase Type', 'Standard').text).toBe('Стандартна')
  })

  it('rewrites the US weight class', () => {
    expect(
      localizeValue(tUa, 'ua', 'Gross Vehicle Weight Rating From', 'Class 1C: 4,001 - 5,000 lb (1,814 - 2,268 kg)').text
    ).toBe('Клас 1C: 1 814 – 2 268 кг (4 001 – 5 000 фунтів)')
  })

  it('leaves codes and free text untouched, and en shows English only', () => {
    expect(localizeValue(tUa, 'ua', 'Engine Model', 'J30A4')).toEqual({ text: 'J30A4', en: null })
    expect(localizeValue(tUa, 'en', 'Fuel Type - Primary', 'Gasoline')).toEqual({ text: 'Gasoline', en: null })
  })

  it('names the plant country in the app language', () => {
    expect(localizeValue(tUa, 'ua', 'Plant Country', 'UNITED STATES (USA)').text).toBe('Сполучені Штати')
  })
})
