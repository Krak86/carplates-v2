/** Global rollups rebuilt by cron (Tue + Fri), the same for everyone: browser + Cloudflare edge may reuse them for 5 min. */
export const ROLLUP_CACHE = 'public, max-age=300'
