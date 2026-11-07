/**
 * Pure helpers of the Commons audio finder: language of a pronunciation file (from its name), origin language of a
 * country, licence / author clean-up of the Commons `extmetadata`, and the strict match of a search hit to a make.
 */

/** ISO 639-3 (Lingua Libre `LL-Q188 (deu)-…`) and 639-1 codes -> the 2-letter code used by the app. */
const LANG3: Record<string, string> = {
  deu: 'de',
  eng: 'en',
  fra: 'fr',
  ita: 'it',
  spa: 'es',
  por: 'pt',
  nld: 'nl',
  swe: 'sv',
  dan: 'da',
  nor: 'no',
  nob: 'no',
  fin: 'fi',
  pol: 'pl',
  ces: 'cs',
  slk: 'sk',
  hun: 'hu',
  ron: 'ro',
  rus: 'ru',
  ukr: 'uk',
  jpn: 'ja',
  kor: 'ko',
  zho: 'zh',
  cmn: 'zh',
  tur: 'tr'
}

/** Origin country (ISO 3166-1 alpha-2, `brand_origin_period.country_code`) -> main language of the brand name. */
const COUNTRY_LANG: Record<string, string> = {
  DE: 'de',
  AT: 'de',
  CH: 'de',
  US: 'en',
  GB: 'en',
  CA: 'en',
  AU: 'en',
  FR: 'fr',
  IT: 'it',
  ES: 'es',
  PT: 'pt',
  NL: 'nl',
  SE: 'sv',
  DK: 'da',
  NO: 'no',
  FI: 'fi',
  PL: 'pl',
  CZ: 'cs',
  SK: 'sk',
  HU: 'hu',
  RO: 'ro',
  RU: 'ru',
  SU: 'ru',
  UA: 'uk',
  JP: 'ja',
  KR: 'ko',
  CN: 'zh',
  TR: 'tr'
}

export const originLang = (countryCode: string | null | undefined): string | null =>
  COUNTRY_LANG[(countryCode ?? '').toUpperCase()] ?? null

/**
 * Language of a Commons pronunciation file: `De-Volkswagen.ogg`, `En-us-Tesla.ogg`, `Pronunciation "Skoda" cs.ogg`,
 * `LL-Q188 (deu)-Name-Volkswagen.wav`. Null when the name does not say.
 */
export function fileLang(name: string): string | null {
  const ll = /^LL-Q\d+ \(([a-z]{3})\)/i.exec(name)
  if (ll) return LANG3[ll[1]!.toLowerCase()] ?? null
  const suffix = /^Pronunciation\b.*[\s_]([a-z]{2,3})\.(?:ogg|oga|wav|mp3|opus|flac)$/i.exec(name)
  if (suffix) return LANG3[suffix[1]!.toLowerCase()] ?? suffix[1]!.toLowerCase()
  const prefix = /^([a-z]{2,3})(?:-[a-z]{2,3})?-/i.exec(name)
  if (prefix) return LANG3[prefix[1]!.toLowerCase()] ?? prefix[1]!.toLowerCase()
  return null
}

const stripHtml = (s: string): string =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

/** Plain-text author of a Commons `Artist` extmetadata value (HTML, often a link), or null. */
export const cleanAuthor = (artist: string | undefined): string | null =>
  stripHtml(artist ?? '').replace(/^Speaker:\s*(.+?)\s+Recorder:.*$/i, '$1') || null

/** Short licence label (`CC BY-SA 3.0`, `CC0`, `Public domain`) from `LicenseShortName`, or null. */
export const cleanLicense = (short: string | undefined): string | null => stripHtml(short ?? '') || null

/** Free licences we may credit and play; anything else is dropped. */
export const isFreeLicense = (license: string | null): boolean =>
  !!license && /^(cc[ -]by|cc0|cc[ -]zero|public domain|pd\b|attribution)/i.test(license)

const norm = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

const AUDIO_EXT = /\.(?:ogg|oga|wav|mp3|opus|flac)$/i

/** The word a pronunciation file is about: `De-Opel.ogg` -> Opel, `LL-Q150 (fra)-User-Renault.wav` -> Renault. */
export function fileSubject(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ')
  const quoted = /^Pronunciation\s+"([^"]+)"/i.exec(base)
  if (quoted) return quoted[1]!
  if (/^LL-Q\d+ \(/i.test(base)) return base.split('-').at(-1) ?? base
  return base.replace(/^[a-z]{2,3}(?:-[a-z]{2,3})?-/i, '')
}

/** Trailing words that do not change the brand (`Tesla, Inc.`). */
const COMPANY_SUFFIX = /^(?:inc|motors?|cars?|automobiles?|company|corporation|corp|ltd|gmbh|ag|sa)$/

/**
 * Does a Commons audio file name belong to this make? Its subject must be the make name itself (diacritics, case, spaces and a
 * company suffix ignored) and the extension must be audio. Strict on purpose: a wrong clip is worse than none, so
 * `Ford` does not match `Gabrielle Giffords` and `Dodge` does not match `dodge a bullet`.
 */
export function matchesMake(fileName: string, makeName: string): boolean {
  if (!AUDIO_EXT.test(fileName)) return false
  const make = norm(makeName)
  const subject = norm(fileSubject(fileName))
  return (
    make.length >= 3 &&
    subject.startsWith(make) &&
    (subject === make || COMPANY_SUFFIX.test(subject.slice(make.length)))
  )
}
