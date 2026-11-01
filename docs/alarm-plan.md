# Air-raid alerts: live status, background layer, history

Drafted 2026-11-01. **Status: researched, nothing built.** Waiting on the Ukraine Alarm API key (request form submitted by the owner; date to be added here).

## Findings (2026-11-01)

| Source | What it is | Terms |
| --- | --- | --- |
| Ukraine Alarm API `api.ukrainealarm.com` (Stfalcon) | Live alerts per region (oblast / district / community), key by request form. Docs + Swagger returned 403 to our fetcher, so endpoints (`/api/v3/regions`, `/api/v3/alerts[/{regionId}]`, `Authorization` header, alert types `AIR`, `ARTILLERY`, `URBAN_FIGHTS`, `CHEMICAL`, `NUCLEAR`) are **from memory, unverified: read Swagger once the key arrives** | Public offer, read 2026-11-01: free (5.1), own commercial use allowed (4.4) except copying the API's functionality for commercial gain, no attribution required (we credit anyway), no liability / "as is" (7.3, 7.4), access can be refused or blocked without reason (4.2, 7.2), terms change with 14 days' email notice (4.6), no reverse engineering (4.5.4). **Webhook ("reverse call") service exists** (1.1.6, 1.1.8) |
| `Vadimkin/ukrainian-air-raid-sirens-dataset` (GitHub) | Daily CSVs in `datasets/`: `official_data_{uk,en}.csv` (from 2022-03-15; oblast level, mostly raion since 2025-12) and `volunteer_data_{uk,en}.csv` (from 2022-02-25, oblast only, eTryvoga channel). Columns include `started_at`, `finished_at`, `naive` (UTC); full schema not read yet | **MIT**, Vadym Klymenko. Credit it and eTryvoga in About `SOURCES` |

Dataset caveats to show on any page built from it: volunteer rows with `naive=True` have an end time of start + 30 min (an estimate); permanent sirens in Luhansk oblast (from 4 April) and Crimea (from 10 December) are in neither file and must be added by hand (confirm the year); after 2025-12 official rows are raion level, so oblast totals need aggregation.

**No movement data.** The API's type is `AIR` for drones, missiles and aircraft alike. Trajectories and weapon names come from Telegram OSINT channels: not used (no licence, fragile, and real-time movement publication is discouraged). Never name a weapon.

## Design decisions

- **Server polls, browser reads our cache.** One poller (15-30 s) keeps the alert list in memory; `GET /api/alarms` serves a minimal own-shape list of active oblasts with `common/cache.ts` headers (30-60 s). The key never reaches the browser. **Webhook later, not first**: lower latency, but it needs a public authenticated endpoint on the blue/green API and the contract says nothing about signing.
- **Do not mirror their API** (4.4): minimal fields, own shape, no full history API, **not** in `PUBLIC_API_PATH_PREFIXES`. The Cloudflare Cache Rule still lists it.
- **Fail closed.** Upstream error or `lastUpdate` older than a few minutes: hide the badge and show "no data" on the map. Never show "no alert" from stale data.
- **Online-only.** Own contract file `packages/shared/src/alarm.ts` (new fields `.nullable().optional()`), no `schemas.ts`, no `offline-cache.ts`. Not in link previews or per-plate `<meta>` (cached and indexed).
- **Region names:** a table from the API's region names to `REGIONS` keys (Kyiv city vs oblast, Crimea, Sevastopol).
- **Wording:** informational, not a warning system; "air raid alert", never a weapon. UI text uses "-", not an em dash.

## Steps

1. ⏳ **Poller + `/api/alarms`** with a mock source until the key arrives; env var in `env.ts`, `deploy-api.yml`, `docs/deploy.md`; region-name map + tests.
2. ⏳ **Region badge** on the plate result (like `RegionCrashChip`): "Air raid alert in the region" / "No alert", hidden with no region or stale data. Shared TanStack query, `enabled: !!region`, refetch 60 s while the tab is visible.
3. ⏳ **`alarm` background layer** (`BACKGROUND_MODES` in `account.ts`, then `LayersPanel`, `DefaultLayoutSection`, `useLayoutUrl`, `ShareLayoutButton`, `/relax`): oblast fill red / calm, slow pulse (respects `prefers-reduced-motion`), static icon per type via `spreadLogos`, tooltip with type and duration, legend with the count. Colour never alone: icon + text. Reuse `StatsMap` geometry; HDR/oklch colours with sRGB fallback. Old clients must tolerate the new `defaultMode` value.
4. ⏳ **History ingest** (independent of the key): `registry` table from the MIT CSVs + our own poller log, seed CSV, About credits.
5. ⏳ **Safety-over-time page** (new route or a `/road-safety` section): alert count, hours and longest alert per oblast per year next to crashes and deaths from the DTP data; year selector; map via `StatsMap`. Honesty rules from `/road-safety` apply: **siren is a threat, not a strike, so never "most bombed"** ("most time under alert"); no combined "more / less secure" score (confounded by fleet size and occupation); show official vs volunteer source and the `naive` estimate.
6. ⏳ **Later:** district level, SSE push to open pages, webhook instead of polling.

Release checklist per step: `docs/plan-done.md` write-up, `docs/features-reference.md` section, `releases.ts`, About (`FEATURES`, `SOURCES`), ua/ru/en strings, new-route rules in CLAUDE.md.

## If the request is rejected or never answered

Access can be refused without a reason (4.2). Steps 4 and 5 do not need the key and go ahead on the MIT dataset alone (refreshed daily from the repo, a cron job like `dtp-patrol`). For live status, the options are: ask again with the clarified use, try another provider (alerts.in.ua has its own key and terms, not read yet), or drop steps 1-3 and keep only history. The feature code is built behind the poller interface so the source can be swapped.

## Owner actions

- Submit the access form (draft text in the session: free site, no ads today, server-side polling every 15-30 s, informational only, no copying of the API). Use an email that is read: contract changes arrive there.
- After the key arrives: read Swagger, correct the endpoint notes above, ask about limits, district data and history.
- Re-read the offer before launching anything paid; alarm data must not become the product (4.4).
