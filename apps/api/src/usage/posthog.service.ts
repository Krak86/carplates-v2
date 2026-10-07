import { Injectable, Logger } from '@nestjs/common'
import { adminAnalyticsResponseSchema } from '@carplates/shared'
import type { AdminAnalyticsResponse } from '@carplates/shared'
import { z } from 'zod'

import { loadEnv, posthogQueryEnabled } from '../env.js'

const CACHE_MS = 10 * 60_000

const hogqlResponseSchema = z.object({ results: z.array(z.array(z.unknown())) })

const SUMMARY_QUERY = `
  SELECT countIf(timestamp > now() - INTERVAL 7 DAY), uniqIf(distinct_id, timestamp > now() - INTERVAL 7 DAY),
         count(), uniq(distinct_id)
  FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL 30 DAY`

const TOP_PATHS_QUERY = `
  SELECT properties.$pathname AS path, count() AS views FROM events
  WHERE event = '$pageview' AND timestamp > now() - INTERVAL 7 DAY AND properties.$pathname IS NOT NULL
  GROUP BY path ORDER BY views DESC LIMIT 10`

/** Dashboards of the services wired in the app; each link only appears when the API knows the id/slug. */
const dashboardLinks = (): AdminAnalyticsResponse['links'] => {
  const env = loadEnv()
  const links: AdminAnalyticsResponse['links'] = []
  // Always shown, so the admin page doubles as a bookmark list; deep links when the ids are configured.
  links.push(
    {
      id: 'posthog',
      label: 'PostHog',
      url: env.POSTHOG_PROJECT_ID ? `${env.POSTHOG_API_HOST}/project/${env.POSTHOG_PROJECT_ID}` : env.POSTHOG_API_HOST
    },
    {
      id: 'sentry',
      label: 'Sentry',
      url: env.SENTRY_ORG_SLUG ? `https://${env.SENTRY_ORG_SLUG}.sentry.io/issues/` : 'https://sentry.io'
    }
  )
  links.push(
    { id: 'gsc', label: 'Google Search Console', url: 'https://search.google.com/search-console' },
    { id: 'cloudflare', label: 'Cloudflare Web Analytics', url: 'https://dash.cloudflare.com/?to=/:account/web-analytics' }
  )
  return links
}

@Injectable()
export class PosthogService {
  private readonly logger = new Logger(PosthogService.name)
  private cache: { at: number; value: AdminAnalyticsResponse } | null = null

  async summary(): Promise<AdminAnalyticsResponse> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value

    const empty = { pageviews7d: null, visitors7d: null, pageviews30d: null, visitors30d: null, topPaths: [] }
    const links = dashboardLinks()
    if (!posthogQueryEnabled(loadEnv())) {
      return adminAnalyticsResponseSchema.parse({ configured: false, error: null, ...empty, links })
    }

    try {
      const [summary, paths] = await Promise.all([this.query(SUMMARY_QUERY), this.query(TOP_PATHS_QUERY)])
      const row = summary[0] ?? []
      const value = adminAnalyticsResponseSchema.parse({
        configured: true,
        error: null,
        pageviews7d: Number(row[0] ?? 0),
        visitors7d: Number(row[1] ?? 0),
        pageviews30d: Number(row[2] ?? 0),
        visitors30d: Number(row[3] ?? 0),
        topPaths: paths.map(r => ({ path: String(r[0]), views: Number(r[1]) })),
        links
      })
      this.cache = { at: Date.now(), value }
      return value
    } catch (err) {
      this.logger.warn(`PostHog query failed: ${String(err)}`)
      return adminAnalyticsResponseSchema.parse({ configured: true, error: 'PostHog query failed', ...empty, links })
    }
  }

  private async query(hogql: string): Promise<unknown[][]> {
    const env = loadEnv()
    const res = await fetch(`${env.POSTHOG_API_HOST}/api/projects/${env.POSTHOG_PROJECT_ID}/query/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.POSTHOG_PERSONAL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hogql } }),
      signal: AbortSignal.timeout(15_000)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return hogqlResponseSchema.parse(await res.json()).results
  }
}
