/**
 * PROTOTYPE — can generations be pulled from Wikipedia/Wikidata? Prints a table, writes nothing.
 *   pnpm exec tsx scripts/src/wiki-generations-probe.ts "Toyota Camry" "Volkswagen Golf" ...
 * Series via Wikipedia → Wikidata id; generations via P179 (part of series); years + facts from each generation's
 * `{{Infobox automobile}}`.
 */
const UA = 'carsua-research/1.0 (https://carsua.app)'
const DEFAULTS = [
  'Toyota Camry',
  'Volkswagen Golf',
  'Skoda Octavia',
  'Honda Civic',
  'Ford Focus',
  'BMW 3 Series',
  'Renault Megane',
  'Nissan Qashqai',
  'Hyundai Tucson',
  'Opel Astra',
  'Mazda 6',
  'Audi A4',
  'Kia Sportage',
  'Daewoo Lanos',
  'Mitsubishi Lancer'
]

type Gen = {
  title: string
  wikidata: string
  yearFrom: number | null
  yearTo: number | null
  body: string
  platform: string
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return (await res.json()) as T
}

async function seriesQid(query: string): Promise<{ title: string; qid: string } | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&prop=pageprops&ppprop=wikibase_item`
  const data = await getJson<{
    query?: { pages: Record<string, { title: string; pageprops?: { wikibase_item?: string } }> }
  }>(url)
  const page = Object.values(data.query?.pages ?? {})[0]
  return page?.pageprops?.wikibase_item ? { title: page.title, qid: page.pageprops.wikibase_item } : null
}

async function generationsOf(qid: string): Promise<{ title: string; wikidata: string }[]> {
  const sparql = `SELECT ?g ?title WHERE { ?g wdt:P179 wd:${qid}; wdt:P31 wd:Q3231690 .
    ?a schema:about ?g; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title } LIMIT 60`
  const data = await getJson<{ results: { bindings: { g: { value: string }; title: { value: string } }[] } }>(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`
  )
  return data.results.bindings.map(b => ({ title: b.title.value, wikidata: b.g.value.split('/').pop()! }))
}

function infoboxField(wikitext: string, field: string): string {
  const m = new RegExp(`\\|\\s*${field}\\s*=([\\s\\S]*?)(?=\\n\\s*\\|\\s*[a-z_ ]+\\s*=|\\n\\}\\})`, 'i').exec(wikitext)
  return (m?.[1] ?? '')
    .replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{[^{}]*\}\}/g, s =>
      s
        .replace(/\{\{|\}\}/g, '')
        .split('|')
        .slice(1)
        .join(' ')
    )
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function years(text: string): { from: number | null; to: number | null } {
  const ys = [...text.matchAll(/\b(19[5-9]\d|20[0-3]\d)\b/g)].map(m => Number(m[1]))
  if (ys.length === 0) return { from: null, to: null }
  const present = /present|current|теперішній/i.test(text)
  return { from: Math.min(...ys), to: present ? null : Math.max(...ys) }
}

async function infoboxes(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20)
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=revisions&rvprop=content&rvslots=main&rvsection=0&titles=${encodeURIComponent(batch.join('|'))}`
    const data = await getJson<{
      query: { pages: Record<string, { title: string; revisions?: { slots: { main: { '*': string } } }[] }> }
    }>(url)
    for (const p of Object.values(data.query.pages)) out.set(p.title, p.revisions?.[0]?.slots.main['*'] ?? '')
  }
  return out
}

async function probe(query: string): Promise<void> {
  const series = await seriesQid(query)
  if (!series) return console.log(`\n## ${query}: no Wikipedia/Wikidata match`)
  const gens = await generationsOf(series.qid)
  if (gens.length === 0)
    return console.log(`\n## ${query} → ${series.title} (${series.qid}): no generation items (P179)`)

  const boxes = await infoboxes(gens.map(g => g.title))
  const rows: Gen[] = gens.map(g => {
    const wt = boxes.get(g.title) ?? ''
    const y = years(infoboxField(wt, 'production') || infoboxField(wt, 'model_years'))
    return {
      ...g,
      yearFrom: y.from,
      yearTo: y.to,
      body: infoboxField(wt, 'body_style').slice(0, 40),
      platform: infoboxField(wt, 'platform').slice(0, 30)
    }
  })
  rows.sort((a, b) => (a.yearFrom ?? 9999) - (b.yearFrom ?? 9999))
  console.log(`\n## ${query} → ${series.title} (${series.qid}): ${rows.length} generations`)
  for (const r of rows) {
    console.log(
      `  ${(r.yearFrom ?? '?') + '–' + (r.yearTo ?? (r.yearFrom ? 'now' : '?'))}  ${r.title}  | ${r.body} | ${r.platform}`
    )
  }
}

for (const q of process.argv.slice(2).length ? process.argv.slice(2) : DEFAULTS) {
  try {
    await probe(q)
  } catch (err) {
    console.log(`\n## ${q}: ${(err as Error).message}`)
  }
}
