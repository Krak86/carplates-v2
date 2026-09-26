/**
 * Outbound link only, same as `dealerUrl.ts` — no per-model article catalog to curate
 * or keep in sync as the registry's `brand`/`model` free text drifts year to year (see
 * `brandLogo.ts`'s header on why that text can't be trusted positionally either).
 *
 * Rather than a lookup table keyed on exact model strings (which would need one entry
 * per brand+model pair and silently miss every spelling MediaWiki wouldn't), this
 * builds a `go=Go` search-and-go URL: MediaWiki redirects straight to the article when
 * the title is an unambiguous match (e.g. "Skoda Octavia" → the Škoda Octavia article)
 * and otherwise lands on an ordinary search-results page — never a dead link.
 *
 * `lang` takes this app's own i18next codes (`ua`/`ru`/`en`, see `apps/web/src/i18n/index.ts`)
 * since that's what every call site already has in hand; Ukrainian Wikipedia's actual
 * subdomain is `uk`, not `ua`, hence the remap.
 */
const WIKI_LANG_DOMAIN: Readonly<Record<string, string>> = {
  ua: 'uk',
  ru: 'ru',
  en: 'en'
}

/** This app's i18next language code → Wikipedia subdomain, shared by `wikiUrl` and the `/api/wiki` proxy. */
export function wikiDomain(lang: string): string {
  return WIKI_LANG_DOMAIN[lang] ?? 'en'
}

/** Wikipedia search-and-go link for a raw registry brand + model, or `null` when neither is known. */
export function wikiUrl(
  brand: string | null | undefined,
  model: string | null | undefined,
  lang: string
): string | null {
  const query = [brand, model].filter(Boolean).join(' ').trim()
  if (!query) return null
  return `https://${wikiDomain(lang)}.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}&go=Go`
}
