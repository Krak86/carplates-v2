-- "Cars for sale" block (CarAPIS listings, docs/market-plan.md). The free tier allows 100 requests a day, so answers and the
-- day's counter live in Postgres: a blue/green deploy (fresh process memory) must not burn the quota again.
-- New tables only: backward-compatible with the previous api colour. The cached payloads are third-party listing data shown to
-- our own users; they are never exported or written to seed CSVs (CarAPIS terms).

-- One row per cached upstream answer. `key` = `list:<kind>:<brand>:<model>`, `detail:<id>` or `slug:<brand>:<model>`;
-- `payload` is the already-mapped response (not the raw upstream body). Expired rows are kept for stale-while-revalidate
-- (up to 14 days) and pruned by the service.
CREATE TABLE app.market_cache (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_market_cache_fetched ON app.market_cache (fetched_at);

-- Listing ids that appeared in a cached list answer: `GET /api/market/go/:id` redirects only these, so it is not an open
-- proxy for the 100 requests a day. Pruned with the cache rows (14 days).
CREATE TABLE app.market_listing (
  id text PRIMARY KEY,
  cache_key text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_market_listing_seen ON app.market_listing (seen_at);

-- CarAPIS gives no rate-limit header, so we count ourselves, per UTC day. `list_used` stops at 85, `detail_used` may use the
-- rest of the 100; `cache_hits`, `ua` and `eu` feed the admin Server tab tile.
CREATE TABLE app.market_budget (
  day date PRIMARY KEY,
  list_used integer NOT NULL DEFAULT 0,
  detail_used integer NOT NULL DEFAULT 0,
  cache_hits integer NOT NULL DEFAULT 0,
  ua integer NOT NULL DEFAULT 0,
  eu integer NOT NULL DEFAULT 0
);
