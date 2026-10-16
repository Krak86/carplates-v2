import type { NewsResponse, StockNewsResponse } from '@carplates/shared'

import type { BlueskyResult } from '@/lib/bluesky'
import type { CommunityResult } from '@/lib/community'
import type { ExportInput, ExportLinksSection, ExportSection, ExportTableSection, Translate } from '@/lib/export-report'
import { NEWS_SOURCE_GROUPS } from '@/lib/news'

export type ExportNewsInput = {
  news?: NewsResponse | null
  bluesky?: BlueskyResult | null
  stackExchange?: CommunityResult | null
  lemmy?: CommunityResult | null
  stockNews?: StockNewsResponse | null
}

function dateOf(iso: string, lang: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString(lang)
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function newsSourceLabel(id: string): string {
  return NEWS_SOURCE_GROUPS.find(g => (g.ids as readonly string[]).includes(id))?.label ?? id
}

function newsTable(input: ExportNewsInput, t: Translate, lang: string): ExportTableSection | null {
  const items = input.news?.items ?? []
  if (items.length === 0) return null
  // Same order as the card: model matches first, then make-only matches.
  const sorted = [...items.filter(i => i.match === 'model'), ...items.filter(i => i.match !== 'model')]
  return {
    type: 'table',
    id: 'news',
    title: t('news.title'),
    note: t('news.disclaimer'),
    columns: [t('export.title'), t('export.source'), t('export.date'), t('export.url')],
    rows: sorted.map(i => [oneLine(i.title), newsSourceLabel(i.source), dateOf(i.publishedAt, lang), i.url])
  }
}

function blueskyTable(result: BlueskyResult | null | undefined, t: Translate, lang: string): ExportTableSection | null {
  const posts = result?.posts ?? []
  if (posts.length === 0) return null
  return {
    type: 'table',
    id: 'bluesky',
    title: `${t('social.title')} - ${t('bluesky.title')}`,
    columns: [t('export.title'), t('export.source'), t('export.date'), t('export.url')],
    rows: posts.map(p => [oneLine(p.text), `@${p.handle}`, dateOf(p.createdAt, lang), p.url])
  }
}

function communityTable(
  result: CommunityResult | null | undefined,
  id: string,
  name: string,
  t: Translate,
  lang: string
): ExportTableSection | null {
  const posts = result?.posts ?? []
  if (posts.length === 0) return null
  return {
    type: 'table',
    id,
    title: `${t('social.title')} - ${name}`,
    columns: [t('export.title'), t('export.source'), t('export.date'), t('export.url')],
    rows: posts.map(p => [oneLine(p.title), p.source, dateOf(p.createdAt, lang), p.url])
  }
}

function stockNewsTable(
  data: StockNewsResponse | null | undefined,
  t: Translate,
  lang: string
): ExportTableSection | null {
  const items = data?.items ?? []
  if (!data?.company || items.length === 0) return null
  return {
    type: 'table',
    id: 'stock-news',
    title: t('stockNews.title', { name: data.company.name }),
    columns: [t('export.title'), t('export.source'), t('export.date'), t('export.url')],
    rows: items.map(i => [oneLine(i.title), i.publisher ?? 'Yahoo Finance', dateOf(i.publishedAt, lang), i.url])
  }
}

/** News, Bluesky / Stack Exchange / Lemmy threads and the listed company's finance news - the card's News and Social sections. */
export function buildNewsSections(input: ExportNewsInput, t: Translate, lang: string): ExportSection[] {
  const sections: (ExportSection | null)[] = [
    newsTable(input, t, lang),
    blueskyTable(input.bluesky, t, lang),
    communityTable(input.stackExchange, 'stackexchange', 'Stack Exchange', t, lang),
    communityTable(input.lemmy, 'lemmy', 'Lemmy', t, lang),
    stockNewsTable(input.stockNews, t, lang)
  ]
  return sections.filter((s): s is ExportSection => s != null)
}

type SourceEntry = { label: string; url: string }

const SOURCE = {
  registry: { label: 'data.gov.ua', url: 'https://data.gov.ua' },
  nhtsa: { label: 'NHTSA', url: 'https://www.nhtsa.gov' },
  euroncap: { label: 'Euro NCAP', url: 'https://www.euroncap.com' },
  jncap: { label: 'JNCAP (NASVA)', url: 'https://www.nasva.go.jp' },
  cncap: { label: 'C-NCAP (CATARC)', url: 'https://www.c-ncap.org.cn' },
  kncap: { label: 'KNCAP', url: 'https://www.kncap.org' },
  iihs: { label: 'IIHS', url: 'https://www.iihs.org' },
  fuel: { label: 'EPA fueleconomy.gov / EEA', url: 'https://www.fueleconomy.gov' },
  rdw: { label: 'RDW open data', url: 'https://opendata.rdw.nl' },
  canada: {
    label: 'Transport Canada',
    url: 'https://wwwapps.tc.gc.ca/Saf-Sec-Sur/7/VRDB-BDRV/search-recherche/menu.aspx'
  },
  mot: { label: 'DVSA MOT (data.gov.uk)', url: 'https://www.data.gov.uk/dataset/e3939ef8-30c7-4ca8-9c7c-ad9475893e38' },
  wiki: { label: 'Wikipedia / Wikidata', url: 'https://www.wikipedia.org' },
  vdb: { label: 'VehiclesDB', url: 'https://vehicledatabases.org' },
  nbu: { label: 'NBU', url: 'https://bank.gov.ua' },
  bluesky: { label: 'Bluesky', url: 'https://bsky.app' },
  stackExchange: { label: 'Stack Exchange', url: 'https://mechanics.stackexchange.com' },
  lemmy: { label: 'Lemmy', url: 'https://lemmy.world' },
  yahoo: { label: 'Yahoo Finance', url: 'https://finance.yahoo.com' }
} as const satisfies Record<string, SourceEntry>

const NEWS_OUTLET_URL: Readonly<Record<string, string>> = {
  infocar: 'https://infocar.ua',
  eauto: 'https://eauto.org.ua',
  autoua: 'https://autoua.net',
  mezha: 'https://mezha.ua',
  'novyny-live': 'https://novyny.live',
  topgir: 'https://topgir.com.ua',
  caranddriver: 'https://www.caranddriver.com',
  motor1: 'https://www.motor1.com',
  carscoops: 'https://www.carscoops.com',
  autoevolution: 'https://www.autoevolution.com'
}

/** Only the sources that actually contributed data to this report - a "where does this come from" list. */
export function buildSourcesSection(input: ExportInput & ExportNewsInput, t: Translate): ExportLinksSection | null {
  const used = new Map<string, SourceEntry>()
  const add = (entry: SourceEntry, when: unknown): void => {
    if (when) used.set(entry.url, entry)
  }

  add(SOURCE.registry, input.current || input.plateHistoryActions || input.vinHistoryActions)
  add(SOURCE.nhtsa, input.vinDecodeResults || input.nhtsa || input.nhtsaRecalls || input.nhtsaComplaints)
  add(SOURCE.euroncap, input.euroncap)
  add(SOURCE.jncap, input.jncap)
  add(SOURCE.cncap, input.cncap)
  add(SOURCE.kncap, input.kncap)
  add(SOURCE.iihs, input.iihs)
  add(SOURCE.fuel, input.fuel)
  add(SOURCE.rdw, input.rdw || input.rdwRecalls)
  add(SOURCE.canada, input.caRecalls)
  add(SOURCE.mot, input.mot)
  add(SOURCE.wiki, input.wiki || input.wikiSpecs || input.generation)
  add(SOURCE.vdb, input.vdb)
  add(SOURCE.nbu, input.fx)

  const outletKeys = new Set(
    (input.news?.items ?? []).map(
      i => NEWS_SOURCE_GROUPS.find(g => (g.ids as readonly string[]).includes(i.source))?.key
    )
  )
  NEWS_SOURCE_GROUPS.forEach(g => {
    const url = NEWS_OUTLET_URL[g.key]
    if (url && outletKeys.has(g.key)) used.set(url, { label: g.label, url })
  })
  add(SOURCE.bluesky, input.bluesky?.posts.length)
  add(SOURCE.stackExchange, input.stackExchange?.posts.length)
  add(SOURCE.lemmy, input.lemmy?.posts.length)
  add(SOURCE.yahoo, input.stockNews?.items.length)

  if (used.size === 0) return null
  return { type: 'links', id: 'sources', title: t('export.sources'), links: [...used.values()] }
}
