import { REGION_IDS } from '@/lib/region-ids'

/**
 * Region flags (`assets/flags/flag-<id>.webp`, 120x80, rendered from the public-domain Wikimedia Commons SVGs — credits in
 * docs/racer-backdrop-credits.md). `no-inline` keeps them out of the JS as data URIs; the PWA precaches them by name.
 */
const URLS = import.meta.glob<string>('../assets/flags/flag-*.webp', {
  eager: true,
  query: '?url&no-inline',
  import: 'default'
})

/** The flag image URL of a region (name as in the registry); undefined when the region has none. */
export function regionFlagUrl(region: string | null | undefined): string | undefined {
  const id = (REGION_IDS as Readonly<Record<string, string>>)[region ?? '']
  return id ? URLS[`../assets/flags/flag-${id}.webp`] : undefined
}

const LARGE_URLS = import.meta.glob<string>('../assets/flags-lg/flaglg-*.webp', {
  eager: true,
  query: '?url&no-inline',
  import: 'default'
})

/** The sharp (480 px wide) flag for a hover preview; fetched only when it is shown, never precached. */
export function regionFlagLargeUrl(region: string | null | undefined): string | undefined {
  const id = (REGION_IDS as Readonly<Record<string, string>>)[region ?? '']
  return id ? LARGE_URLS[`../assets/flags-lg/flaglg-${id}.webp`] : undefined
}
