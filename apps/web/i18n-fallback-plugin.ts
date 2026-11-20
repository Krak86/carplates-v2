import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { Plugin } from 'vite'

const I18N_DIR = fileURLToPath(new URL('./src/i18n/', import.meta.url))
const SOURCE_LANG = 'ua'
const VIRTUAL_RE = /(^|[\\/])([a-z]{2})\.fallback\.json$/
const RESOLVED_PREFIX = '\0i18n-fallback:'

type Dictionary = Record<string, string>

const read = (lang: string): Dictionary => JSON.parse(readFileSync(`${I18N_DIR}${lang}.json`, 'utf8')) as Dictionary

/** The `ua` entries a language lacks: the only part of the `ua` fallback a visitor in that language needs. */
export function fallbackDelta(lang: string): Dictionary {
  const own = read(lang)
  return Object.fromEntries(Object.entries(read(SOURCE_LANG)).filter(([key]) => !(key in own)))
}

/**
 * Serves `src/i18n/<lang>.fallback.json` as a virtual module generated from `ua.json` + `<lang>.json`, so the three
 * language JSONs stay the only source. A language with no gaps (ru) has an empty delta and needs no import.
 */
export function i18nFallback(): Plugin {
  return {
    name: 'carplates-i18n-fallback',
    enforce: 'pre',
    resolveId(source, importer) {
      const lang = VIRTUAL_RE.exec(source)?.[2]
      if (!lang || !importer || !importer.replaceAll('\\', '/').includes('/src/i18n/')) return null
      return `${RESOLVED_PREFIX}${lang}`
    },
    load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return null
      const lang = id.slice(RESOLVED_PREFIX.length)
      this.addWatchFile(`${I18N_DIR}${SOURCE_LANG}.json`)
      this.addWatchFile(`${I18N_DIR}${lang}.json`)
      return `export default ${JSON.stringify(fallbackDelta(lang))}`
    }
  }
}
