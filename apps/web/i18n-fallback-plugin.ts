import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { Plugin } from 'vite'

import { sliceOf } from './src/i18n/packs.ts'

const I18N_DIR = fileURLToPath(new URL('./src/i18n/', import.meta.url))
const SOURCE_LANG = 'ua'
// `<lang>.<slice>.pack.json` (the slice's own keys) and `<lang>.<slice>.delta.pack.json` (the `ua` keys of that slice the language lacks).
const VIRTUAL_RE = /(^|[\\/])([a-z]{2})\.([A-Za-z]+)(\.delta)?\.pack\.json$/
const RESOLVED_PREFIX = '\0i18n:'

type Dictionary = Record<string, string>

const read = (lang: string): Dictionary => JSON.parse(readFileSync(`${I18N_DIR}${lang}.json`, 'utf8')) as Dictionary
const inSlice = (dict: Dictionary, slice: string): Dictionary =>
  Object.fromEntries(Object.entries(dict).filter(([key]) => sliceOf(key) === slice))

/** The keys of one slice of a language's dictionary (`core` = every key outside a pack). */
export function sliceOfLang(lang: string, slice: string): Dictionary {
  return inSlice(read(lang), slice)
}

/** The `ua` entries of one slice that a language lacks: the only part of the `ua` fallback a visitor in that language needs. */
export function fallbackDelta(lang: string, slice: string): Dictionary {
  const own = read(lang)
  return inSlice(Object.fromEntries(Object.entries(read(SOURCE_LANG)).filter(([key]) => !(key in own))), slice)
}

/**
 * Serves the per-slice dictionaries (`src/i18n/<lang>.<slice>.pack.json`, `<lang>.<slice>.delta.pack.json`) as virtual modules cut from
 * `<lang>.json`, so the three language JSONs stay the only source. A slice a language has no gaps in has an empty delta.
 */
export function i18nFallback(): Plugin {
  return {
    name: 'carplates-i18n-fallback',
    enforce: 'pre',
    resolveId(source, importer) {
      const match = VIRTUAL_RE.exec(source)
      if (!match || !importer || !importer.replaceAll('\\', '/').includes('/src/i18n/')) return null
      const [, , lang, slice, delta] = match
      return `${RESOLVED_PREFIX}${lang}-${slice}${delta ? '-delta' : ''}`
    },
    load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return null
      const [lang = '', slice = '', delta] = id.slice(RESOLVED_PREFIX.length).split('-')
      this.addWatchFile(`${I18N_DIR}${SOURCE_LANG}.json`)
      this.addWatchFile(`${I18N_DIR}${lang}.json`)
      return `export default ${JSON.stringify(delta ? fallbackDelta(lang, slice) : sliceOfLang(lang, slice))}`
    }
  }
}
