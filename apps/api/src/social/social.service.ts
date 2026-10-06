import { Inject, Injectable } from '@nestjs/common'
import { socialPosts } from '@carplates/db'
import { socialChannelsFor, youtubeChannelUrl } from '@carplates/shared'
import type { SocialResponse } from '@carplates/shared'
import { desc, eq } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

/** Latest uploads kept per channel in the response. */
const POSTS_PER_CHANNEL = 8

@Injectable()
export class SocialService {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  /** A brand's own channel first, then its parent group's; a channel with no ingested posts is left out. Channels live in `@carplates/shared`. */
  async lookup(brand: string): Promise<SocialResponse> {
    const { db } = this.dbService
    const channels = await Promise.all(
      socialChannelsFor(brand).map(async c => {
        const rows = await db
          .select()
          .from(socialPosts)
          .where(eq(socialPosts.channel, c.id))
          .orderBy(desc(socialPosts.publishedAt))
          .limit(POSTS_PER_CHANNEL)
        return {
          id: c.id,
          kind: c.kind,
          name: c.name,
          url: youtubeChannelUrl(c.youtubeId),
          posts: rows.map(r => ({
            url: r.url,
            platform: r.platform,
            title: r.title,
            summary: r.summary,
            imageUrl: r.imageUrl,
            publishedAt: r.publishedAt.toISOString()
          }))
        }
      })
    )
    return { channels: channels.filter(c => c.posts.length) }
  }
}
