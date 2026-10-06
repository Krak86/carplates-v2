/**
 * Pure parsing for the social ingest (social.ts): a YouTube channel's Atom feed -> `SocialEntry[]`. Facts only — title,
 * ≤300-char description, thumbnail URL, date, watch URL; the video itself is never copied.
 */
import * as cheerio from 'cheerio'

import { plainSummary } from './news-parse.js'

export type SocialEntry = {
  url: string
  title: string
  summary: string | null
  imageUrl: string | null
  publishedAt: Date
}

export type SocialFeed = {
  /** The channel's own title (`<author><name>`), logged at ingest so a wrong channel id in `SOCIAL_CHANNELS` is visible. */
  channelTitle: string | null
  entries: SocialEntry[]
}

export function parseYoutubeFeed(xml: string): SocialFeed {
  const $ = cheerio.load(xml, { xmlMode: true })
  const entries: SocialEntry[] = []
  $('entry').each((_, el) => {
    const entry = $(el)
    const videoId = entry.find('yt\\:videoId').first().text().trim()
    const title = entry.children('title').first().text().trim()
    const published = new Date(entry.children('published').first().text().trim())
    if (!videoId || !title || Number.isNaN(published.getTime())) return
    const description = entry.find('media\\:description').first().text()
    entries.push({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      summary: plainSummary(description),
      imageUrl:
        entry.find('media\\:thumbnail').first().attr('url') ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      publishedAt: published
    })
  })
  return { channelTitle: $('feed > author > name').first().text().trim() || null, entries }
}
