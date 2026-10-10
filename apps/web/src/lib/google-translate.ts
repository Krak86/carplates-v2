/** Longest text put in the link: Google Translate rejects very long URLs. */
const MAX_TEXT_LENGTH = 2000

/** UI language code → Google Translate code (the app's Ukrainian is `ua`, Google's is `uk`). */
const toGoogleLang = (lang: string): string => (lang === 'ua' ? 'uk' : lang)

/** Link that opens `text` (written in `from`) translated into `to` on translate.google.com. */
export function googleTranslateUrl(text: string, from: string, to: string): string {
  const params = new URLSearchParams({
    sl: toGoogleLang(from),
    tl: toGoogleLang(to),
    text: text.slice(0, MAX_TEXT_LENGTH),
    op: 'translate'
  })
  return `https://translate.google.com/?${params.toString()}`
}

/** True when `text` in language `from` is worth a translate link for a reader using `to`. */
export const needsTranslation = (from: string, to: string): boolean => toGoogleLang(from) !== toGoogleLang(to)
