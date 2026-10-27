import { z } from 'zod'

import { newsPageResponseSchema, newsResponseSchema } from './schemas.js'

/**
 * The news answers plus `updatedAt`: when `pnpm ingest:news` last stored a headline (newest `fetched_at`; null = never ran).
 * Own file: no offline-cache bust when it grows.
 */
const updatedAt = z.string().nullable().optional()
export const newsFeedResponseSchema = newsResponseSchema.extend({ updatedAt })
export const newsFeedPageResponseSchema = newsPageResponseSchema.extend({ updatedAt })
export type NewsFeedResponse = z.infer<typeof newsFeedResponseSchema>
export type NewsFeedPageResponse = z.infer<typeof newsFeedPageResponseSchema>
