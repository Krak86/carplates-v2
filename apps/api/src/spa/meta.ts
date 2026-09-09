import type { PlateLookupResponse, VinDecodeResponse } from '@carplates/shared'

export interface MetaInput {
  siteUrl: string
  path: string
  title: string
  description: string
  image?: string
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Render the per-page meta block injected into index.html. */
export function renderMetaTags(m: MetaInput): string {
  const canonical = `${m.siteUrl}${m.path}`
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    `<meta property="og:title" content="${esc(m.title)}">`,
    `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${esc(canonical)}">`,
    ...(m.image ? [`<meta property="og:image" content="${esc(m.image)}">`] : []),
    `<meta name="twitter:card" content="${m.image ? 'summary_large_image' : 'summary'}">`,
    `<link rel="canonical" href="${esc(canonical)}">`
  ].join('\n    ')
}

/** Replace the placeholder <title> and inject the meta block before </head>. */
export function injectMeta(html: string, metaBlock: string): string {
  return html.replace(/<title>[\s\S]*?<\/title>\s*/i, '').replace('</head>', `    ${metaBlock}\n  </head>`)
}

export function plateMetaText(res: PlateLookupResponse): { title: string; description: string } {
  const c = res.current
  const car = [c.brand, c.model].filter(Boolean).join(' ')
  const year = c.makeYear ? ` ${c.makeYear}` : ''
  const facts = [car || null, c.makeYear ? String(c.makeYear) : null, c.fuel, res.region].filter(Boolean)
  return {
    title: `${res.plate} — ${car || 'vehicle'}${year} | Cars UA`,
    description: `${res.plate}: ${facts.join(', ')}. Data from the state open vehicle registry.`
  }
}

export function vinMetaText(res: VinDecodeResponse): { title: string; description: string } {
  const pick = (name: string): string | undefined => res.results.find(r => r.variable === name)?.value
  const car = [pick('Make'), pick('Model')].filter(Boolean).join(' ')
  const year = pick('Model Year')
  const facts = [car || null, year ?? null, pick('Fuel Type - Primary')].filter(Boolean)
  return {
    title: `${res.vin} — ${car || 'VIN'}${year ? ` ${year}` : ''} | Cars UA`,
    description: `VIN ${res.vin}: ${facts.join(', ') || 'decoded vehicle details'}. Source: NHTSA vPIC.`
  }
}
