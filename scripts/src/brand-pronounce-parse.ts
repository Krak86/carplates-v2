/**
 * Pure parsers for the Wikipedia lead wikitext of a car make (`action=parse&prop=wikitext&section=0`), brand pronunciation:
 *  - en: `{{IPA|de|ˈfɔlksˌvaːɡŋ̍|German|de-Volkswagen.ogg}}` (native IPA + audio file), `{{IPAc-en|UK|ˈ|f|ɒ|…}}` (often in `{{efn}}`)
 *  - uk: `(вимова: {{lang-uk|Фольксваґен}})` (Ukrainian respelling), rarely `{{IPA}}` / `МФА`
 *  - ru: `МФА: {{IPA|[pø.ʒo]}}; произношение близко к «пёжо́»` (IPA + Cyrillic respelling)
 * Hand-written overrides (a CSV) are merged per cell by the caller. No I/O here.
 */

export type Lead = {
  /** Native-language IPA, no brackets or slashes. */
  ipa: string | null
  /** ISO code of the language the IPA is in (`de`, `fr`, `ja`…), when the template says so. */
  ipaLang: string | null
  /** English reading (`{{IPAc-en}}`), UK / US when marked, else `uk`. */
  enIpa: { uk: string | null; us: string | null }
  /** Cyrillic or other respelling. */
  respell: string | null
  /** Commons file name of the best audio hint (no `File:` prefix), native language preferred. */
  audio: string | null
}

const AUDIO_EXT = /\.(?:ogg|oga|mp3|wav|flac)$/i

/** Every `{{name …}}` in `wt` (case-insensitive name regex source), as raw inner text, nested braces balanced. */
export function templates(wt: string, nameRe: string): string[] {
  const out: string[] = []
  const open = new RegExp(`\\{\\{\\s*(?:${nameRe})(?=[\\s|}])`, 'gi')
  for (let m = open.exec(wt); m; m = open.exec(wt)) {
    let depth = 0
    let i = m.index
    for (; i < wt.length; i++) {
      if (wt.startsWith('{{', i)) {
        depth++
        i++
      } else if (wt.startsWith('}}', i)) {
        depth--
        i++
        if (depth === 0) break
      }
    }
    if (depth === 0) {
      out.push(wt.slice(m.index + 2, i - 1))
      open.lastIndex = i + 1
    }
  }
  return out
}

/** Template inner text -> `[name, ...args]`, split on top-level pipes only. */
export function splitArgs(inner: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2)
    if (two === '{{' || two === '[[') {
      depth++
      cur += two
      i++
    } else if (two === '}}' || two === ']]') {
      depth--
      cur += two
      i++
    } else if (inner[i] === '|' && depth === 0) {
      parts.push(cur)
      cur = ''
    } else cur += inner[i]
  }
  parts.push(cur)
  return parts.map(p => p.trim())
}

const NAMED = /^([a-z][\w -]*?)\s*=\s*([\s\S]*)$/i

/** Positional args (no `x=` ones) and the named ones, after the template name. */
function args(inner: string): { pos: string[]; named: Record<string, string> } {
  const [, ...rest] = splitArgs(inner)
  const pos: string[] = []
  const named: Record<string, string> = {}
  for (const a of rest) {
    const m = NAMED.exec(a)
    if (m && !a.startsWith('[') && !a.includes('{{')) named[m[1]!.toLowerCase()] = m[2]!.trim()
    else pos.push(a)
  }
  return { pos, named }
}

/** `[pø.ʒo]` / `/pø.ʒo/` -> `pø.ʒo`; stray markup removed. */
export function cleanIpa(raw: string): string | null {
  const s = raw
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/^[[/]+|[\]/]+$/g, '')
    .trim()
  return s || null
}

const audioName = (s: string | undefined): string | null => {
  const v = s
    ?.replace(/^(?:file|файл|image):/i, '')
    .trim()
    .replace(/^"|"$/g, '')
  return v && AUDIO_EXT.test(v) ? v : null
}

type Ipa = { lang: string | null; ipa: string | null; audio: string | null }

/** `{{IPA|de|ipa|German|file.ogg}}`, `{{IPA|ru|ipa||audio=file.wav}}`, `{{IPA|[pø.ʒo]}}` (lang-less, ru style). */
export function parseIpaTemplate(inner: string): Ipa {
  const { pos, named } = args(inner)
  const hasLang = pos.length > 1 && /^[a-z]{2,3}(?:-[a-z]+)?$/i.test(pos[0] ?? '')
  const lang = hasLang ? pos[0]!.toLowerCase() : null
  const rest = hasLang ? pos.slice(1) : pos
  const audio = audioName(named.audio) ?? rest.slice(1).map(audioName).find(Boolean) ?? null
  return { lang, ipa: cleanIpa(rest[0] ?? ''), audio }
}

/** `{{IPAc-en|UK|ˈ|f|ɒ|…|audio=x.ogg}}` -> region, ipa (tokens joined, `_` = space). */
export function parseIpaCEn(inner: string): { region: 'uk' | 'us'; ipa: string | null; audio: string | null } {
  const { pos, named } = args(inner)
  let region: 'uk' | 'us' = 'uk'
  const tokens = [...pos]
  const head = tokens[0]?.toLowerCase()
  if (head === 'uk' || head === 'us') {
    region = head
    tokens.shift()
  } else if (head === 'lang' || head === 'local') tokens.shift()
  const ipa = tokens
    .filter(t => !AUDIO_EXT.test(t))
    .join('')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { region, ipa: ipa || null, audio: audioName(named.audio) }
}

const empty = (): Lead => ({ ipa: null, ipaLang: null, enIpa: { uk: null, us: null }, respell: null, audio: null })

/** English lead: native IPA (+ audio) from `{{IPA}}`, English reading from `{{IPAc-en}}`. First hit of each wins. */
export function parseEnLead(wt: string): Lead {
  const out = empty()
  for (const t of templates(wt, 'IPA(?:-[a-z]+)?')) {
    const p = parseIpaTemplate(t)
    if (!p.ipa) continue
    // a `{{IPA|en|…}}` is the English reading, not the native one
    if (p.lang === 'en' || p.lang === 'en-us' || p.lang === 'en-gb') {
      out.enIpa.uk ??= p.ipa
      continue
    }
    if (!out.ipa) {
      out.ipa = p.ipa
      out.ipaLang = p.lang
    }
    out.audio ??= p.audio
  }
  for (const t of templates(wt, 'IPAc-en')) {
    const p = parseIpaCEn(t)
    if (!p.ipa) continue
    out.enIpa[p.region] ??= p.ipa
    // an English-region audio file is a fallback only: native audio (from `{{IPA}}`) wins
    if (p.audio && !out.audio && !out.ipa) out.audio = p.audio
  }
  return out
}

/** Ukrainian lead: respelling from `{{lang-uk|…}}`; IPA from `МФА`/`{{IPA}}` when present. */
export function parseUkLead(wt: string): Lead {
  const out = empty()
  const lang = templates(wt, 'lang-uk|мова-uk')[0]
  if (lang) {
    const text = args(lang).pos[0]
    const clean = text?.replace(/''+/g, '').trim()
    if (clean) out.respell = clean
  }
  for (const t of templates(wt, 'IPA(?:-[a-z]+)?')) {
    const p = parseIpaTemplate(t)
    if (p.ipa) {
      out.ipa = p.ipa
      out.ipaLang = p.lang
      out.audio = p.audio
      break
    }
  }
  return out
}

/** Russian lead: IPA from `МФА … {{IPA|[…]}}` (or any `{{IPA}}`), respelling from "произношение … близко к «…»". */
export function parseRuLead(wt: string): Lead {
  const out = empty()
  for (const t of templates(wt, 'IPA(?:-[a-z]+)?')) {
    const p = parseIpaTemplate(t)
    if (p.ipa) {
      out.ipa = p.ipa
      out.ipaLang = p.lang
      out.audio = p.audio
      break
    }
  }
  const m = /(?:произношени[ея]|произносится)[^«\n]{0,60}[«"]([^»"\n]+)[»"]/i.exec(wt)
  if (m?.[1]) out.respell = m[1].replace(/''+/g, '').trim()
  return out
}

export type Wiki = 'en' | 'uk' | 'ru'

export function parseLead(lang: Wiki, wt: string): Lead {
  return lang === 'en' ? parseEnLead(wt) : lang === 'uk' ? parseUkLead(wt) : parseRuLead(wt)
}
