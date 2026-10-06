/**
 * Social ingest: polls each make's / parent group's public YouTube channel RSS feed (channels listed in
 * `@carplates/shared` `SOCIAL_CHANNELS`) into `registry.social_posts`. No API key and no quota — the feed holds the
 * channel's latest ~15 uploads. Links + facts only.
 *
 *   pnpm ingest:social                       # every channel
 *   pnpm ingest:social -- --channel audi     # one channel id (repeatable; `group:gm` for a group)
 *   pnpm ingest:social -- --dry-run          # fetch + parse + report, write nothing
 *   pnpm ingest:social -- --list             # print the channels, no network
 *
 * Idempotent (rows upserted by url): run it from a scheduler every ~6 h. Rows published more than `--keep-days`
 * (default 365) ago are pruned. A channel that fails or returns nothing is reported and skipped; it never fails the run.
 * The feed's own channel title is printed next to the configured name — a mismatch means a wrong id in the table.
 */
import { createDb, socialPosts } from '@carplates/db'
import type { SocialPostInsert } from '@carplates/db'
import { SOCIAL_CHANNELS, youtubeFeedUrl } from '@carplates/shared'
import { lt, sql } from 'drizzle-orm'

import { parseYoutubeFeed } from './social-parse.js'

const USER_AGENT = 'carsua.app-ingest/1.0'
const FETCH_TIMEOUT_MS = 20_000
const DEFAULT_KEEP_DAYS = 365
const DELAY_MS = 1000

type Args = { channels: string[]; dryRun: boolean; list: boolean; keepDays: number }

function parseArgs(argv: string[]): Args {
  const a: Args = { channels: [], dryRun: false, list: false, keepDays: DEFAULT_KEEP_DAYS }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--channel') a.channels.push(argv[++i] ?? '')
    else if (arg === '--dry-run') a.dryRun = true
    else if (arg === '--list') a.list = true
    else if (arg === '--keep-days') a.keepDays = Number(argv[++i])
  }
  return a
}

const log = (...m: unknown[]): void => {
  console.log(...m)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.list) {
    for (const c of SOCIAL_CHANNELS) log(`${c.id.padEnd(22)} ${c.kind.padEnd(5)} ${c.name.padEnd(28)} ${c.youtubeId}`)
    return
  }

  const unknown = args.channels.filter(id => !SOCIAL_CHANNELS.some(c => c.id === id))
  if (unknown.length) throw new Error(`unknown --channel ${unknown.join(', ')} (see --list)`)
  const channels = SOCIAL_CHANNELS.filter(c => !args.channels.length || args.channels.includes(c.id))

  const { db, close } = createDb()
  try {
    let total = 0
    for (const [i, channel] of channels.entries()) {
      if (i) await new Promise(resolve => setTimeout(resolve, DELAY_MS))
      try {
        const res = await fetch(youtubeFeedUrl(channel.youtubeId), {
          headers: { 'user-agent': USER_AGENT },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        })
        if (!res.ok) throw new Error(`status ${res.status}`)
        const feed = parseYoutubeFeed(await res.text())
        if (!feed.entries.length) {
          log(`${channel.id.padEnd(22)} WARNING 0 entries — wrong channel id or the feed changed`)
          continue
        }
        const rows = feed.entries.map((entry): SocialPostInsert => ({
          ...entry,
          platform: 'youtube',
          channel: channel.id
        }))
        const newest = feed.entries.reduce((a, b) => (a.publishedAt > b.publishedAt ? a : b)).publishedAt
        log(
          `${channel.id.padEnd(22)} ${String(rows.length).padStart(2)} videos · newest ${newest.toISOString().slice(0, 10)} · "${feed.channelTitle ?? '?'}" (configured: ${channel.name})`
        )
        total += rows.length
        if (args.dryRun) continue

        await db
          .insert(socialPosts)
          .values(rows)
          .onConflictDoUpdate({
            target: socialPosts.url,
            set: {
              title: sql`excluded.title`,
              summary: sql`excluded.summary`,
              imageUrl: sql`excluded.image_url`,
              fetchedAt: sql`now()`
            }
          })
      } catch (err) {
        log(`${channel.id.padEnd(22)} FAILED ${String(err)} — skipped`)
      }
    }

    if (args.dryRun) {
      log(`dry run: ${total} videos parsed, nothing written`)
      return
    }
    const cutoff = new Date(Date.now() - args.keepDays * 86_400_000)
    const pruned = await db
      .delete(socialPosts)
      .where(lt(socialPosts.publishedAt, cutoff))
      .returning({ url: socialPosts.url })
    const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(socialPosts)
    log(
      `done: ${total} videos upserted, ${pruned.length} pruned (> ${args.keepDays} days), ${count?.n ?? 0} in the table`
    )
  } finally {
    await close()
  }
}

await main()
