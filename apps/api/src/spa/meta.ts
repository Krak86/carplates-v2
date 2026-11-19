import { OG_HEIGHT, OG_WIDTH } from './og-card.js'
import { DEFAULT_LANG, LANGS, OG_LOCALE, SITE_NAME, type Lang } from './spa-text.js'

export type MetaInput = {
  siteUrl: string
  path: string
  lang: Lang
  title: string
  description: string
  image: string
  /** MIME type of `image` when it is not one of our 1200x630 PNG cards (shared photos are JPEGs of unknown size: no width/height tags). */
  imageType?: string
  /** Pixel size of a non-card `image`; both set = width/height tags, else none. */
  imageSize?: { width: number; height: number }
  /** Overrides `og:url` only (canonical stays `path`): Telegram/Facebook key their preview cache on it, so section links need their own. */
  ogUrl?: string
  /** Plate/VIN pages: keep millions of per-vehicle URLs out of search indexes (link unfurlers still read the tags). */
  noindex?: boolean
  /** Indexable static pages: self-canonical per language plus hreflang alternates for all of them. */
  alternates?: boolean
  /** Structured data (catalog pages: `BreadcrumbList`), emitted as one `application/ld+json` script. */
  jsonLd?: object
}

/** hreflang codes (ISO 639-1; `ua` is the app's key for Ukrainian). */
export const HREFLANG: Record<Lang, string> = { ua: 'uk', ru: 'ru', en: 'en' }

/** Absolute URL of a static page in a language: the default language is the bare path, others carry `?lang=`. */
export const langUrl = (siteUrl: string, path: string, lang: Lang): string =>
  lang === DEFAULT_LANG ? `${siteUrl}${path}` : `${siteUrl}${path || '/'}?lang=${lang}`

/** `<link rel="alternate" hreflang>` entries for every language plus `x-default` (the default language). */
export const alternateLinks = (siteUrl: string, path: string): { hreflang: string; href: string }[] => [
  ...LANGS.map(l => ({ hreflang: HREFLANG[l], href: langUrl(siteUrl, path, l) })),
  { hreflang: 'x-default', href: langUrl(siteUrl, path, DEFAULT_LANG) }
]

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Render the per-page meta block injected into index.html. */
export function renderMetaTags(m: MetaInput): string {
  const canonical = m.alternates ? langUrl(m.siteUrl, m.path, m.lang) : `${m.siteUrl}${m.path}`
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    ...(m.noindex ? [`<meta name="robots" content="noindex, follow">`] : []),
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:title" content="${esc(m.title)}">`,
    `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="${OG_LOCALE[m.lang]}">`,
    `<meta property="og:url" content="${esc(m.ogUrl ?? canonical)}">`,
    `<meta property="og:image" content="${esc(m.image)}">`,
    `<meta property="og:image:type" content="${esc(m.imageType ?? 'image/png')}">`,
    ...(m.imageType
      ? m.imageSize
        ? [
            `<meta property="og:image:width" content="${m.imageSize.width}">`,
            `<meta property="og:image:height" content="${m.imageSize.height}">`
          ]
        : []
      : [
          `<meta property="og:image:width" content="${OG_WIDTH}">`,
          `<meta property="og:image:height" content="${OG_HEIGHT}">`
        ]),
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(m.title)}">`,
    `<meta name="twitter:description" content="${esc(m.description)}">`,
    `<meta name="twitter:image" content="${esc(m.image)}">`,
    `<link rel="canonical" href="${esc(canonical)}">`,
    ...(m.alternates
      ? alternateLinks(m.siteUrl, m.path).map(
          a => `<link rel="alternate" hreflang="${a.hreflang}" href="${esc(a.href)}">`
        )
      : []),
    // `<` is escaped so a name can never close the script element.
    ...(m.jsonLd
      ? [`<script type="application/ld+json">${JSON.stringify(m.jsonLd).replace(/</g, '\\u003c')}</script>`]
      : [])
  ].join('\n    ')
}

const HERO_PRELOAD_MARK = 'fetchpriority="high"'

/** Drop the placeholder <title>/description from index.html and inject the meta block before </head>. */
export function injectMeta(html: string, metaBlock: string): string {
  // A page that preloads its own hero photo must not also fetch the generic background avif at high priority: both share one
  // slow link and the background loses nothing by arriving after the photo.
  const base = metaBlock.includes(HERO_PRELOAD_MARK)
    ? html.replace(/(<link rel="preload" as="image" type="image\/avif"[^>]*?)\s+fetchpriority="high"/, '$1')
    : html
  return base
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace('</head>', `    ${metaBlock}\n  </head>`)
}

/**
 * `<link rel="preload" as="image">` of a plate page's hero photo, so the browser fetches it while the JS bundle loads instead of
 * after the plate request resolves. `crossorigin` matches the hero `<img crossOrigin="anonymous">` (else the preload is not reused).
 */
export const renderHeroPreload = (url: string): string =>
  `<link rel="preload" as="image" href="${esc(url)}" crossorigin="anonymous" ${HERO_PRELOAD_MARK}>`
