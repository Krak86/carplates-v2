import { OG_HEIGHT, OG_WIDTH } from './og-card.js'
import { OG_LOCALE, SITE_NAME, type Lang } from './spa-text.js'

export type MetaInput = {
  siteUrl: string
  path: string
  lang: Lang
  title: string
  description: string
  image: string
  /** Plate/VIN pages: keep millions of per-vehicle URLs out of search indexes (link unfurlers still read the tags). */
  noindex?: boolean
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Render the per-page meta block injected into index.html. */
export function renderMetaTags(m: MetaInput): string {
  const canonical = `${m.siteUrl}${m.path}`
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    ...(m.noindex ? [`<meta name="robots" content="noindex, follow">`] : []),
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:title" content="${esc(m.title)}">`,
    `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="${OG_LOCALE[m.lang]}">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    `<meta property="og:image" content="${esc(m.image)}">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta property="og:image:width" content="${OG_WIDTH}">`,
    `<meta property="og:image:height" content="${OG_HEIGHT}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(m.title)}">`,
    `<meta name="twitter:description" content="${esc(m.description)}">`,
    `<meta name="twitter:image" content="${esc(m.image)}">`,
    `<link rel="canonical" href="${esc(canonical)}">`
  ].join('\n    ')
}

/** Drop the placeholder <title>/description from index.html and inject the meta block before </head>. */
export function injectMeta(html: string, metaBlock: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace('</head>', `    ${metaBlock}\n  </head>`)
}
