/** "2025-07-09" → a locale date ("9 July 2025"); the raw string when it is not a valid ISO date. */
export function formatRecallDate(iso: string | null, locale: string): string | null {
  if (!iso) return null
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    date
  )
}

/** Whole-number share of open recalls (0-1) as "12 %", "<1 %" for a tiny non-zero share; null when absent. */
export function formatOpenShare(share: number | null | undefined): string | null {
  if (share == null) return null
  const pct = share * 100
  if (pct > 0 && pct < 1) return '<1 %'
  return `${Math.round(pct)} %`
}

/** Vehicle count with thousands separators; null for a missing or zero count (RDW writes 0 for "not reported"). */
export function formatVehicleCount(n: number | null, locale: string): string | null {
  return n == null || n <= 0 ? null : new Intl.NumberFormat(locale).format(n)
}

/** RDW's fixed category wording (19 values in the register) → i18n slug (`recalls.cat.<slug>`). */
const CATEGORY_SLUGS: Readonly<Record<string, string>> = {
  'Motorrijtuigen - carrosserie (beschermingsmiddelen inzittenden)': 'occupantProtection',
  'Motorrijtuigen - motor inclusief brandstof-, smeer- en koelsysteem': 'engine',
  'Motorrijtuigen en aanhangwagens - elektrische installatie': 'electrical',
  'Motorrijtuigen en aanhangwagens - reminrichting': 'brakes',
  'Motorrijtuigen en aanhangwagens - assen, wielen, velgen, banden': 'wheels',
  'Motorrijtuigen en aanhangwagens - stuurinrichting': 'steering',
  'Motorrijtuigen en aanhangwagens - diversen': 'misc',
  'Motorrijtuigen en aanhangwagens - ophanging': 'suspension',
  'Motorrijtuigen - krachtoverbrenging': 'drivetrain',
  'Motorrijtuigen en aanhangwagens - carrosserie (diverse)': 'bodyMisc',
  'Motorrijtuigen en aanhangwagens - carrosserie (deuren, motorkap, laadkleppen)': 'doors',
  'Motorrijtuigen - carrosserie (zitplaatsen)': 'seats',
  'Motorrijtuigen en aanhangwagens - carrosserie (ruiten, ruitenwissers, ruitensproeiers)': 'glass',
  'Motorrijtuigen en aanhangwagens - lichten, lichtsignalen en retroreflectie': 'lights',
  'Motorrijtuigen en aanhangwagens - algemene bouwwijze': 'construction',
  'Motorrijtuigen en aanhangwagens - verbinding tussen motorvoertuig en aanhangwagen': 'coupling',
  'Product voldoet niet aan de typegoedkeuringseisen': 'typeApproval',
  'Onderdelen van motorrijtuigen en aanhangwagens': 'parts',
  '(Nog) niet bekend': 'unknown'
}

/** RDW's fixed hazard wording (5 values) → i18n slug (`recalls.hazard.<slug>`). */
const HAZARD_SLUGS: Readonly<Record<string, string>> = {
  'Een (verkeers)ongeval met letselschade': 'accidentInjury',
  'Verhoogde kans op letsel bij een ongeval': 'higherInjury',
  'Brand met letselschade': 'fire',
  'Het belasten van het milieu': 'environment',
  '(Nog) niet bekend': 'unknown'
}

/** i18n key for a known RDW category text; null for a wording we have no translation for (the UI then shows the original). */
export const categoryKey = (category: string): string | null => {
  const slug = CATEGORY_SLUGS[category]
  return slug ? `recalls.cat.${slug}` : null
}

export const hazardKey = (hazard: string): string | null => {
  const slug = HAZARD_SLUGS[hazard]
  return slug ? `recalls.hazard.${slug}` : null
}

/** How many campaigns show before "Show more". */
export const RECALLS_PREVIEW = 3
