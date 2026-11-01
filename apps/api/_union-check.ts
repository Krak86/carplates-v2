import { createDb } from '@carplates/db'
import { sql } from 'drizzle-orm'

import { unionLots } from './src/auctions/auctions-union.js'

const { db, close } = createDb()
try {
  const a = await db.execute(
    sql`WITH l AS (${unionLots}) SELECT source, grp, count(*)::int n, count(sale_price)::int sold, min(when_at) lo, max(when_at) hi FROM l GROUP BY 1,2 ORDER BY 1,2`
  )
  console.log(a.rows)
  const b = await db.execute(
    sql`WITH l AS (${unionLots}) SELECT * FROM l WHERE source='prozorro' AND sale_price IS NOT NULL ORDER BY when_at DESC LIMIT 1`
  )
  console.log(JSON.stringify(b.rows[0]).slice(0, 1200))
  const c = await db.execute(
    sql`WITH l AS (${unionLots}) SELECT to_char(when_at AT TIME ZONE 'UTC','YYYY-MM') m, count(*)::int FROM l GROUP BY 1 ORDER BY 1 DESC LIMIT 4`
  )
  console.log(c.rows)
} finally {
  await close()
}
