/**
 * On-device translation of one text, no server and no API key. Two engines, both opt-in:
 *  - `chrome`: the browser's built-in Translator API (Chrome / Edge desktop). It manages its own language-pack download and
 *    does not report the size.
 *  - `opus`: Helsinki-NLP OPUS-MT models run with transformers.js (WebAssembly), downloaded from Hugging Face once and kept
 *    in the browser cache. Only English pairs exist, so Dutch → Ukrainian / Russian goes through English.
 * Nothing is downloaded by detection: `detectOptions` only asks the browser and reads a local "already downloaded" flag.
 */

export type TranslatorId = 'chrome' | 'opus'

/** `ready`: translates now; `download`: needs a one-time download first; `unavailable`: cannot translate this pair. */
export type LocalOption = {
  id: TranslatorId
  status: 'ready' | 'download' | 'unavailable'
  /** Download size in MB; null when the engine does not report it (Chrome). */
  sizeMb: number | null
  /** Model steps (opus): per-step sizes, for the "110 + 105 MB" explanation. */
  steps?: { pair: string; sizeMb: number; cached: boolean }[]
}

type Progress = (percent: number | null) => void

/** Approximate download size (MB) of the quantized encoder + decoder of each OPUS-MT pair, from the Hugging Face repos. */
export const OPUS_PAIR_SIZE_MB: Readonly<Record<string, number>> = { 'nl-en': 110, 'en-uk': 105, 'en-ru': 107 }

const OPUS_CACHED_PREFIX = 'opus-mt-cached:'

/** App language (`ua`) → ISO code the translators use. */
const isoLang = (lang: string): string => (lang === 'ua' ? 'uk' : lang)

/** Pairs the OPUS route runs for `from` → `to`: [] when the text is already in that language. */
export function opusSteps(from: string, to: string): string[] {
  const a = isoLang(from)
  const b = isoLang(to)
  if (a === b) return []
  if (a === 'en') return [`en-${b}`]
  if (b === 'en') return [`${a}-en`]
  return [`${a}-en`, `en-${b}`]
}

const readCached = (pair: string): boolean => {
  try {
    return localStorage.getItem(OPUS_CACHED_PREFIX + pair) === '1'
  } catch {
    return false
  }
}

const markCached = (pair: string): void => {
  try {
    localStorage.setItem(OPUS_CACHED_PREFIX + pair, '1')
  } catch {
    // private mode / blocked storage: the browser cache still holds the files, we only forget the flag
  }
}

// ---- Chrome built-in Translator ------------------------------------------------------------------------------------

type ChromeAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available'
type ChromeTranslator = { translate: (text: string) => Promise<string>; destroy?: () => void }
type ChromeTranslatorApi = {
  availability: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<ChromeAvailability>
  create: (o: {
    sourceLanguage: string
    targetLanguage: string
    monitor?: (m: EventTarget) => void
  }) => Promise<ChromeTranslator>
}

const chromeApi = (): ChromeTranslatorApi | undefined => (globalThis as { Translator?: ChromeTranslatorApi }).Translator

async function chromeOption(from: string, to: string): Promise<LocalOption> {
  const api = chromeApi()
  const unavailable: LocalOption = { id: 'chrome', status: 'unavailable', sizeMb: null }
  if (!api) return unavailable
  try {
    const state = await api.availability({ sourceLanguage: isoLang(from), targetLanguage: isoLang(to) })
    if (state === 'available') return { id: 'chrome', status: 'ready', sizeMb: null }
    if (state === 'downloadable' || state === 'downloading') return { id: 'chrome', status: 'download', sizeMb: null }
  } catch {
    // availability() throws for a language code the browser does not know
  }
  return unavailable
}

async function translateWithChrome(text: string, from: string, to: string, onProgress: Progress): Promise<string> {
  const api = chromeApi()
  if (!api) throw new Error('Translator API missing')
  const translator = await api.create({
    sourceLanguage: isoLang(from),
    targetLanguage: isoLang(to),
    monitor: m => {
      m.addEventListener('downloadprogress', e =>
        onProgress(Math.round(((e as Event & { loaded: number }).loaded ?? 0) * 100))
      )
    }
  })
  resetChromeReady() // the pack is installed now: "translate here" buttons may appear
  try {
    onProgress(null)
    return await translator.translate(text)
  } finally {
    translator.destroy?.()
  }
}

// ---- OPUS-MT through transformers.js -------------------------------------------------------------------------------

const splitSentences = (text: string): string[] =>
  text
    .replace(/[ \t]+/g, ' ')
    .split(/(?<=[.!?;])\s+(?=[A-Z0-9(])|\n+/)
    .map(s => s.trim())
    .filter(Boolean)

function opusOption(from: string, to: string): LocalOption {
  const pairs = opusSteps(from, to)
  const steps = pairs.map(pair => ({ pair, sizeMb: OPUS_PAIR_SIZE_MB[pair] ?? 0, cached: readCached(pair) }))
  if (pairs.length === 0 || steps.some(s => !s.sizeMb) || typeof WebAssembly === 'undefined') {
    return { id: 'opus', status: 'unavailable', sizeMb: null }
  }
  const missing = steps.filter(s => !s.cached).reduce((sum, s) => sum + s.sizeMb, 0)
  return { id: 'opus', status: missing === 0 ? 'ready' : 'download', sizeMb: missing, steps }
}

async function translateWithOpus(text: string, from: string, to: string, onProgress: Progress): Promise<string> {
  const { pipeline } = await import('@huggingface/transformers')
  const pairs = opusSteps(from, to)
  const sentences = splitSentences(text)
  // Per-file download progress, folded into one percentage across all steps.
  const files = new Map<string, { loaded: number; total: number }>()
  const totalMb = pairs.reduce((sum, p) => sum + (OPUS_PAIR_SIZE_MB[p] ?? 0), 0)
  let current: string[] = sentences
  for (const pair of pairs) {
    const translator = await pipeline('translation', `Xenova/opus-mt-${pair}`, {
      dtype: 'q8',
      progress_callback: (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
        if (p.status !== 'progress' || !p.file || !p.total) return
        files.set(`${pair}/${p.file}`, { loaded: p.loaded ?? 0, total: p.total })
        const loaded = [...files.values()].reduce((sum, f) => sum + f.loaded, 0)
        onProgress(Math.min(99, Math.round((loaded / 1048576 / Math.max(totalMb, 1)) * 100)))
      }
    })
    markCached(pair)
    onProgress(null)
    const next: string[] = []
    for (const sentence of current) {
      const out = (await translator(sentence, { max_new_tokens: 256 })) as { translation_text: string }[]
      next.push(out[0]?.translation_text ?? '')
    }
    current = next
  }
  return current.join('\n')
}

// ---- Public API ----------------------------------------------------------------------------------------------------

const chromeReady = new Map<string, Promise<boolean>>()

/** True when the built-in browser translator can translate `from` → `to` right now (installed, nothing to download). Cached. */
export function isChromeReady(from: string, to: string): Promise<boolean> {
  const key = `${from}>${to}`
  let cached = chromeReady.get(key)
  if (!cached) {
    cached = chromeOption(from, to).then(o => o.status === 'ready')
    chromeReady.set(key, cached)
  }
  return cached
}

/** Forget the cached answers of `isChromeReady` (after a language pack was downloaded). */
export const resetChromeReady = (): void => chromeReady.clear()

/** What this browser can do for `from` → `to`, without downloading anything. Order = preference. */
export async function detectOptions(from: string, to: string): Promise<LocalOption[]> {
  return [await chromeOption(from, to), opusOption(from, to)].filter(o => o.status !== 'unavailable')
}

/** Translates `text` with the chosen engine; `onProgress(percent)` while downloading, `null` once it is translating. */
export function translateLocally(
  id: TranslatorId,
  text: string,
  from: string,
  to: string,
  onProgress: Progress
): Promise<string> {
  return id === 'chrome'
    ? translateWithChrome(text, from, to, onProgress)
    : translateWithOpus(text, from, to, onProgress)
}
