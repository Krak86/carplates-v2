import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'

const SEARCH_URL = 'https://api.bsky.app/xrpc/app.bsky.feed.searchPosts'
/** Posts requested per search. Opted-out authors and text-less posts are dropped afterwards, and every remaining post is shown (the Social section lists them all; the side widget slices off its own few). */
const FETCH_LIMIT = 25
const SEARCH_PAGE_URL = 'https://bsky.app/search'
/** Authors who opted out of logged-out viewing carry this self-label — their posts are never shown here. */
const OPT_OUT_LABEL = '!no-unauthenticated'

const imageSchema = z.object({ thumb: z.string(), alt: z.string().optional() })

/** Image-bearing embed views: plain images, an external link card thumb, or images attached to a quote (record-with-media). */
const embedSchema = z.object({
  images: z.array(imageSchema).optional(),
  external: z.object({ thumb: z.string().optional() }).optional(),
  media: z
    .object({
      images: z.array(imageSchema).optional(),
      external: z.object({ thumb: z.string().optional() }).optional()
    })
    .optional()
})

const responseSchema = z.object({
  posts: z.array(
    z.object({
      uri: z.string(),
      author: z.object({
        handle: z.string(),
        displayName: z.string().optional(),
        avatar: z.string().optional(),
        labels: z.array(z.object({ val: z.string() })).optional()
      }),
      record: z.object({ text: z.string().optional(), createdAt: z.string().optional() }),
      embed: embedSchema.optional(),
      indexedAt: z.string()
    })
  )
})

export type BlueskyPost = {
  id: string
  url: string
  handle: string
  displayName: string
  avatar: string | null
  text: string
  createdAt: string
  images: { src: string; alt: string }[]
}

export type BlueskyResult = {
  posts: BlueskyPost[]
  /** The search phrase that produced the posts — the "more" link opens Bluesky's own search for it. */
  searchUrl: string
}

/** "MAKE MODEL (YEAR)" — Bluesky's own search decides how to match it. */
export function blueskySearchTerms(brand: string, model: string | null, year: number | null): string[] {
  const makeModel = [brand.trim(), model?.trim()].filter(Boolean).join(' ')
  return year && model ? [`${makeModel} (${year})`, makeModel] : [makeModel]
}

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/** Some feed bots (e.g. autoweek) post HTML-escaped text ("Cee&#039;d"); Bluesky shows it verbatim, so decode it here. */
export function decodeEntities(s: string): string {
  return s.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (m, dec, hex, name) => {
    if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? m
    const code = dec ? Number(dec) : parseInt(hex, 16)
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m
  })
}

async function searchPosts(q: string): Promise<BlueskyPost[]> {
  const imagesOf = (e: z.infer<typeof embedSchema> | undefined): BlueskyPost['images'] => {
    const imgs = e?.images ?? e?.media?.images
    if (imgs?.length) return imgs.map(i => ({ src: i.thumb, alt: i.alt ?? '' }))
    const thumb = e?.external?.thumb ?? e?.media?.external?.thumb
    return thumb ? [{ src: thumb, alt: '' }] : []
  }

  const res = await fetch(`${SEARCH_URL}?${new URLSearchParams({ q, limit: String(FETCH_LIMIT) })}`)
  if (!res.ok) throw new Error(`Bluesky search failed: ${res.status}`)
  const { posts } = responseSchema.parse(await res.json())
  return posts
    .filter(p => !p.author.labels?.some(l => l.val === OPT_OUT_LABEL) && !!p.record.text?.trim())
    .map(p => ({
      id: p.uri,
      url: `https://bsky.app/profile/${p.author.handle}/post/${p.uri.split('/').pop()}`,
      handle: p.author.handle,
      displayName: p.author.displayName || p.author.handle,
      avatar: p.author.avatar ?? null,
      text: decodeEntities(p.record.text!.trim()),
      createdAt: p.record.createdAt ?? p.indexedAt,
      images: imagesOf(p.embed)
    }))
}

/** Posts for the make+model+year phrase first, topped up from the broader make+model phrase (deduped) while fewer than `FETCH_LIMIT` were found. */
async function getBlueskyPosts(brand: string, model: string | null, year: number | null): Promise<BlueskyResult> {
  const posts: BlueskyPost[] = []
  let searchUrl = SEARCH_PAGE_URL
  for (const term of blueskySearchTerms(brand, model, year)) {
    const found = await searchPosts(term)
    if (!found.length) continue
    if (!posts.length) searchUrl = `${SEARCH_PAGE_URL}?q=${encodeURIComponent(term)}`
    for (const post of found) if (!posts.some(p => p.id === post.id)) posts.push(post)
    if (posts.length >= FETCH_LIMIT) break
  }
  return { posts, searchUrl }
}

// Live third-party data: short staleTime, outside the persisted offline groups.
export function blueskyQuery(brand: string, model: string | null, year: number | null) {
  return queryOptions({
    queryKey: ['bluesky', brand, model, year],
    queryFn: () => getBlueskyPosts(brand, model, year),
    staleTime: 10 * 60 * 1000
  })
}
