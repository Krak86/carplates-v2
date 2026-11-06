import { formatCompareRef, parseCompareRef } from '@carplates/shared'
import type { CompareRef } from '@carplates/shared'

// The URL grammar lives in `@carplates/shared` (the API reads `/compare` links for its link previews too).
export { formatCompareRef, parseCompareRef }

/** `/compare?a=…&b=…`; an empty slot is left out. */
export function compareHref(a: CompareRef | null, b: CompareRef | null): string {
  const params = new URLSearchParams()
  if (a) params.set('a', formatCompareRef(a))
  if (b) params.set('b', formatCompareRef(b))
  // The separators stay readable (`?a=plate:AA1234BB&b=m:bmw/3series/2015/diesel`); both are legal in a query string.
  const query = params.toString().replace(/%3A/gi, ':').replace(/%2F/gi, '/')
  return query ? `/compare?${query}` : '/compare'
}

/** Same car (so a slot is not compared with itself). */
export const sameRef = (a: CompareRef | null, b: CompareRef | null): boolean =>
  !!a && !!b && formatCompareRef(a) === formatCompareRef(b)
