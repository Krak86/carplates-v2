import type { TFunction } from 'i18next'

import { countryIso, countryName, formatFieldValue } from '@/components/vin/helpers'
import type { Lang } from '@/i18n'

/** i18n key suffix for an NHTSA name or value — must stay identical to the slug the translation files were generated with. */
export function vinSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/ - /g, '__')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** A text in the chosen language plus the English original (`en` is null when they are the same — nothing to show twice). */
export type Bilingual = { text: string; en: string | null }

// Values worth sharing with the plate card: the registry-side fuel words already exist under `rdw.fuel.*`.
const VALUE_ALIASES: Readonly<Record<string, string>> = {
  gasoline: 'rdw.fuel.petrol',
  diesel: 'rdw.fuel.diesel',
  electric: 'rdw.fuel.ev'
}

const SEPARATORS: readonly (readonly [string, string])[] = [
  [', ', ', '],
  [' - ', ' — '],
  [' and ', ' + ']
]

function lookup(t: TFunction, key: string): string | null {
  const text = t(key, { defaultValue: '' })
  return text === '' ? null : text
}

/** "Class 1C: 4,001 - 5,000 lb (1,814 - 2,268 kg)" → "Клас 1C: 1 814 – 2 268 кг (4 001 – 5 000 фунтів)". */
function localizeWeightClass(t: TFunction, value: string): string | null {
  const m = value.trim().match(/^Class (\w+): (.+) \((.+)\)$/)
  if (!m) return null
  const [, cls, lb, kg] = m
  const unitize = (s: string): string =>
    s
      .replace(/(\d),(?=\d{3})/g, '$1 ')
      .replace(/ - /g, ' – ')
      .replace(/\blb\b/g, t('vin.unit.lb'))
      .replace(/\bkg\b/g, t('vin.unit.kg'))
      .replace('or less', t('vin.unit.orLess'))
      .replace('and above', t('vin.unit.andAbove'))
  return `${t('vin.unit.cls')} ${cls}: ${unitize(kg ?? '')} (${unitize(lb ?? '')})`
}

function localizeText(t: TFunction, variable: string, raw: string): string | null {
  const value = raw.trim()
  if (value === '') return null
  const slug = vinSlug(value)
  const charger = variable === 'Charger Level' ? value.match(/^Level (\d)/) : null
  const direct =
    lookup(t, `vin.vv.${vinSlug(variable)}.${charger ? `level_${charger[1]}` : slug}`) ??
    (VALUE_ALIASES[slug] ? lookup(t, VALUE_ALIASES[slug]) : null) ??
    lookup(t, `vin.val.${slug}`)
  if (direct) return direct

  // Compound values ("Halogen, LED", "U.S., Canada") — translate every part or none.
  for (const [sep, joiner] of SEPARATORS) {
    const parts = value.split(sep)
    if (parts.length < 2) continue
    const done = parts.map(p => localizeText(t, variable, p))
    if (done.every((p): p is string => p !== null)) return done.join(joiner)
  }
  return null
}

/** Localized label for an NHTSA variable, with the English name alongside. English UI shows the name once. */
export function localizeLabel(t: TFunction, lang: Lang, variable: string): Bilingual {
  if (lang === 'en') return { text: variable, en: null }
  return { text: lookup(t, `vin.var.${vinSlug(variable)}`) ?? variable, en: variable }
}

/**
 * Localized value for an NHTSA variable: numbers get localized units, known words come from the dictionary, plant
 * countries use the browser's region names, and anything unknown (engine codes, free text) stays as NHTSA wrote it.
 */
export function localizeValue(t: TFunction, lang: Lang, variable: string, raw: string): Bilingual {
  const english = formatFieldValue(variable, raw)
  if (lang === 'en') return { text: english, en: null }

  const unit = localizeUnits(t, variable, raw)
  const iso = variable === 'Plant Country' ? countryIso(raw) : null
  const text =
    unit ??
    (iso ? countryName(iso, lang) : null) ??
    localizeWeightClass(t, raw) ??
    localizeText(t, variable, raw) ??
    english
  return { text, en: text === english ? null : english }
}

/** Numeric measures with a unit (cc, L, hp, kW, cu in) — same rounding as `formatFieldValue`, localized unit. */
function localizeUnits(t: TFunction, variable: string, raw: string): string | null {
  const english = formatFieldValue(variable, raw)
  if (english === raw) return null
  const unit = english.replace(/^[\d.,\s-]+/, '')
  const keys: Readonly<Record<string, string>> = {
    cc: 'rdw.unitCc',
    L: 'vin.unit.l',
    hp: 'rdw.unitHp',
    kW: 'rdw.unitKw',
    'cu in': 'vin.unit.ci'
  }
  const key = keys[unit]
  return key ? `${english.slice(0, english.length - unit.length)}${t(key)}` : null
}

/** Unit-localized versions of the engine-card figures. */
export function unitLabels(t: TFunction): { l: string; hp: string; kw: string } {
  return { l: t('vin.unit.l'), hp: t('rdw.unitHp'), kw: t('rdw.unitKw') }
}
