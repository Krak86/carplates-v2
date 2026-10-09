import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'

import { decodeEntities } from '@/lib/bluesky'

const LIMIT = 10
const STACK_URL = 'https://api.stackexchange.com/2.3/search/advanced'
const STACK_SITE = 'mechanics'
const STACK_PAGE_URL = 'https://mechanics.stackexchange.com/search'
const LEMMY_HOST = 'https://lemmy.world'

/** A thread from a public discussion site — a title, a score and a link out (no sign-in, no key). */
export type CommunityPost = {
  id: string
  url: string
  title: string
  /** Author or community, shown under the title. */
  source: string
  createdAt: string
  score: number
  /** Answers (Stack Exchange) or comments (Lemmy). */
  replies: number
  thumb: string | null
}

export type CommunityResult = {
  posts: CommunityPost[]
  searchUrl: string
}

/** "MAKE MODEL" — the year is left out: these sites match every word, and "2019" empties the result. */
export function communitySearchTerm(brand: string, model: string | null): string {
  return [brand.trim(), model?.trim()].filter(Boolean).join(' ')
}

const stackSchema = z.object({
  items: z.array(
    z.object({
      question_id: z.number(),
      link: z.string(),
      title: z.string(),
      score: z.number(),
      answer_count: z.number(),
      creation_date: z.number(),
      owner: z.object({ display_name: z.string().optional() }).optional()
    })
  )
})

async function getStackPosts(brand: string, model: string | null): Promise<CommunityResult> {
  const q = communitySearchTerm(brand, model)
  const params = new URLSearchParams({
    q,
    site: STACK_SITE,
    sort: 'relevance',
    order: 'desc',
    pagesize: String(LIMIT)
  })
  const res = await fetch(`${STACK_URL}?${params}`)
  if (!res.ok) throw new Error(`Stack Exchange search failed: ${res.status}`)
  const { items } = stackSchema.parse(await res.json())
  return {
    searchUrl: `${STACK_PAGE_URL}?${new URLSearchParams({ q })}`,
    posts: items.map(i => ({
      id: `se-${i.question_id}`,
      url: i.link,
      title: decodeEntities(i.title),
      source: decodeEntities(i.owner?.display_name ?? 'Mechanics SE'),
      createdAt: new Date(i.creation_date * 1000).toISOString(),
      score: i.score,
      replies: i.answer_count,
      thumb: null
    }))
  }
}

const lemmySchema = z.object({
  posts: z.array(
    z.object({
      post: z.object({
        id: z.number(),
        name: z.string(),
        published: z.string(),
        thumbnail_url: z.string().nullish(),
        removed: z.boolean().optional(),
        deleted: z.boolean().optional(),
        nsfw: z.boolean().optional()
      }),
      community: z.object({ name: z.string() }),
      counts: z.object({ score: z.number(), comments: z.number() })
    })
  )
})

async function getLemmyPosts(brand: string, model: string | null): Promise<CommunityResult> {
  const q = communitySearchTerm(brand, model)
  const params = new URLSearchParams({ q, type_: 'Posts', sort: 'TopAll', limit: String(LIMIT) })
  const res = await fetch(`${LEMMY_HOST}/api/v3/search?${params}`)
  if (!res.ok) throw new Error(`Lemmy search failed: ${res.status}`)
  const { posts } = lemmySchema.parse(await res.json())
  return {
    searchUrl: `${LEMMY_HOST}/search?${new URLSearchParams({ q, type: 'Posts', sort: 'TopAll' })}`,
    posts: posts
      .filter(p => !p.post.removed && !p.post.deleted && !p.post.nsfw)
      .map(p => ({
        id: `lemmy-${p.post.id}`,
        url: `${LEMMY_HOST}/post/${p.post.id}`,
        title: p.post.name,
        source: `c/${p.community.name}`,
        createdAt: p.post.published,
        score: p.counts.score,
        replies: p.counts.comments,
        thumb: p.post.thumbnail_url ?? null
      }))
  }
}

// Live third-party data: short staleTime, outside the persisted offline groups.
export function stackExchangeQuery(brand: string, model: string | null) {
  return queryOptions({
    queryKey: ['stackexchange', brand, model],
    queryFn: () => getStackPosts(brand, model),
    staleTime: 30 * 60 * 1000
  })
}

export function lemmyQuery(brand: string, model: string | null) {
  return queryOptions({
    queryKey: ['lemmy', brand, model],
    queryFn: () => getLemmyPosts(brand, model),
    staleTime: 30 * 60 * 1000
  })
}
