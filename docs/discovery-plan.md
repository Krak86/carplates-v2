# Discovery plan: crawlers, search, other sites, users

Status (2026-10-30): **Phase 0 in progress, Phase 1 started, Phase 2 MVP live (deployed, catalog built on the VPS, Cloudflare rules and prod browser check done; sitemap resubmit pending)** (static page titles and the `/og/` robots rule are deployed and verified
on prod; the manual Phase 0 items below are not done yet). One checklist for "how do crawlers, other sites and users find carsua.app".
The technical design of the catalog pages stays in [catalog-plan.md](catalog-plan.md) (do not copy it here, it would drift).
Related, already done: sitemap/robots ([PLAN.md](../PLAN.md) "Bot protection, sitemap & SEO"), `llms.txt`, ARD manifest,
public OpenAPI document, per-page link previews (`features-reference.md` "Link previews"), `/read` guides.

## Decisions

- **No VPS upgrade.** Disk is the binding constraint, not CPU/RAM ([deploy.md](deploy.md): 6 vCPU / 12 GB / 200 GB). Catalog
  pages read small precomputed tables by primary key (`catalog_year_stats`), rebuilt inside `db:refresh-derived`, never a
  live `GROUP BY` over 16.7M rows. Revisit only if metrics show API latency after launch.
- **Cache at the edge.** Cloudflare cache rule for `/cars/*` and `/api/catalog/*` (1 day or more) plus
  `Cache-Control: public, s-maxage=…` from the API. Catalog data changes monthly (delta ingest).
- **No static prerender at build time.** Catalog data changes with the monthly ingest, not with a deploy, and deploys are
  path-filtered. Instead the API injects a small semantic HTML block (h1, summary, stats table, plain links) into `#root` for
  `/cars/...`, behind the edge cache. Optional later: store the rendered block in `catalog_model.seo_html` at
  `db:refresh-catalog` time. Details: catalog-plan.md Step 5.
- **Load stays low without a bigger VPS or new infra.** Taxonomy and hot pages in API memory, `LazySection`s never fire for
  crawlers, MVP-sized sitemap first, 90% or more edge cache hit ratio on `/cars/*` as the target. Rules: catalog-plan.md Step 5
  "Load".
- **Verified bots must not be blocked.** Check Bot Fight Mode and the `/api/*` throttles (`common/throttle.ts`) against
  Googlebot/Bingbot after the pages are live.
- **Plate/VIN pages stay `noindex`.** Indexable pages carry no personal data, only aggregates above a data threshold
  (`CATALOG_MIN_CARS`, start at 200; thin pages stay reachable but `noindex`, otherwise doorway/scaled-content demotion).
- **Reddit is a traffic channel, not SEO** (links are `nofollow`). Real backlinks come from Habr, DOU, dev.to, directories and
  the data.gov.ua listing.

## Phase 0: now, no code (about 1 hour)

Done and verified on prod 2026-10-30 (curl + metatags.io + Facebook debugger):

- [x] Pre-flight: `robots.txt` and `sitemap.xml` serve correctly (`application/xml`, hreflang, `https://carsua.app` URLs; Chrome shows
      the sitemap as flat text because of the `xhtml:` namespace, harmless)
- [x] New static titles/descriptions live in ua/ru/en for `/`, `/about`, `/stats`, `/wanted`, `/fuel`, `/safety`, `/read`
- [x] `robots.txt` now allows `/og/default.png` and `/og/page/` and still blocks per-plate `/og/<plate>.png` (renders are expensive and
      enumerable); `/robots.txt` had to be purged in Cloudflare by hand after the deploy

Open:

- [x] **Facebook debugger "Corrupted Image" for `https://carsua.app/og/default.png`** gone: re-scraped 2026-11-01, 206, 1200x630 (it was the first scrape right after the deploy/purge). The scrape showed the Ukrainian tagline overflowing its panel; fixed 2026-11-01 (`genericCardSize` in `og-card.ts`), re-scrape after the next api deploy and purge `/og/default.png`.
      Original note:
      The file itself is a valid 1200x630 PNG (114529 bytes, correct `IEND`, same bytes for a `facebookexternalhit` user agent, about
      0.2 s uncached). Click "Scrape Again"; if it persists, look in Cloudflare Security -> Events for blocked/challenged requests to
      `/og/default.png` from AS32934 (Facebook) and add a verified-bot exception (Bot Fight Mode / rate rules)
- [x] `deploy-api.yml`: also purges `$URL/robots.txt` and `$URL/sitemap.xml` (exact URLs) next to the `/og/` prefix (2026-10-30; takes
      effect on the next api deploy)
- [x] Google Search Console: domain verified, `/sitemap.xml` read (see PLAN.md catalog line); request indexing for `/`, `/stats`, `/read` is optional
- [x] Bing Webmaster Tools: imported from Search Console, sitemap submitted
- [x] **Diia Open Data services catalog** (backlink from the source itself): submitted for moderation 2026-11-01 via
      https://diia.data.gov.ua/services "Додати сервіс". Form fields: name, 256x256 image (from `logo.png`), description, dataset
      links (3: registrations `06779371-...`, 2026 archive `0ffd8b75-...`, wanted `2cd12755-...`), email, phone, service URL,
      App Store / Google Play (empty), developer name. Open: wait for moderation, then check the listing and its backlink
- [ ] **data.gov.ua forum post** (impact story, Обговорення): `https://forum.data.gov.ua` did not resolve in DNS on 2026-11-01
      (diia.data.gov.ua still links to it). Retry in a day or two; meanwhile optionally write via https://data.gov.ua/feedback.
      Listing text for the post: see "Diia listing text" below
- [ ] Directories: Product Hunt, AlternativeTo, awesome-lists for open data / Ukrainian tech
- [x] Cloudflare cache rules for `/cars/*` and `/api/catalog/*` (created and verified MISS -> HIT 2026-10-30, re-checked 2026-11-01)

### Diia listing text

**Title** (ua): `carsua.app - перевірка авто за номером або VIN`

**Title** (en): `carsua.app - Ukrainian vehicle lookup by plate or VIN`

**Description** (ua): Безкоштовний сервіс пошуку транспортного засобу за державним номером або VIN на основі відкритих даних
МВС (data.gov.ua): марка, модель, рік, колір, пальне, регіон, історія реєстрацій. Без персональних даних власників.
Розпізнавання номера з камери, офлайн-режим (PWA), мови: українська, російська, англійська.

**Description** (en): Free lookup of a vehicle by Ukrainian plate or VIN built on the MIA open registrations datasets from
data.gov.ua: make, model, year, colour, fuel, region, registration history. No owner personal data. Plate recognition from
camera, offline PWA, Ukrainian/Russian/English.

**Link:** https://carsua.app · **Datasets used:** the MIA vehicle registration resources ingested via CKAN (dataset names from
`docs/commands-reference.md` `ingest:*`) · **Contact:** the project email

## Phase 1: small code items (about 2-3 days total, independent of the catalog)

- [x] **IndexNow** (2026-10-30): the api serves the key file `/<key>.txt` (`indexnow.ts`, a committed constant: the key is public
      by design, so no env var) and `deploy-api.yml` POSTs every sitemap `<loc>` to `api.indexnow.org` after each api deploy
      (best-effort). Needs a sitemap index once the catalog passes 10,000 URLs per request
- [ ] **Press/About facts page** (about 2 h): what it is, data sources, update dates, logo pack, contact email. New public
      route ⇒ `ROUTE_TITLE_KEYS` + `STATIC_PAGES` (ua/ru/en) per CLAUDE.md
- [ ] **Open stats download** (about 0.5 day): aggregated CSV/JSON (top models, registrations per region and month), CC
      license, no plate-level rows. Cited by journalists and bloggers
- [ ] **Embeddable badge / "check a plate" widget** (about 1 day): each embed is a backlink; keep it iframe-free if possible
- [x] **Static page titles/descriptions rewritten** (2026-10-30, `spa-text.ts`: `/`, `/about`, `/stats`, `/wanted`, `/fuel`,
      `/safety`, `/read`, ua/ru/en). Open: shorten the over-long `/read/*` titles (about 75 chars, cut at about 60) and
      descriptions (over 170); after deploy re-scrape in the Facebook debugger and request indexing in Search Console
- [x] **Per-page share cards** (2026-10-30): `/og/page/<slug>.png` (`page-card.ts`, `buildPageCardSvg` in `og-card.ts`) is the
      `og:image` of every static page except `/`; the catalog pages reuse the same mechanism
- [ ] **Share prompt** after a lookup ("send to a friend buying a car"); `/og/` cards already exist, make sure every stats and
      `/read` page has a good one
- [ ] Each item: `releases.ts` entry, About page text, tests, docs per CLAUDE.md

## Phase 2: catalog pages `/cars/:make/:model[/:year]` (about 6-9 working days)

Full design: [catalog-plan.md](catalog-plan.md). Summary and estimate:

| Step                                                                                                | Estimate   |
| --------------------------------------------------------------------------------------------------- | ---------- |
| 1. Taxonomy: `catalogKey.ts`, `catalog_alias`, overrides CSV (the risky part)                       | 1.5-2 days |
| 2. Year rollup SQL + `db:refresh-catalog` script                                                    | 0.5-1 day  |
| 3. API + `packages/shared/src/catalog.ts` contract + `@Throttle`                                    | 0.5 day    |
| 4. Web: routes, `ModelYearCard`, "In Ukraine" section, extract `ModelSections`                      | 1.5-2 days |
| 5. SEO: `metaFor` branch, injected `#root` block, JSON-LD, hreflang, chunked sitemap, cache headers | 1-2 days   |
| 6. Docs, i18n ua/ru/en, About, releases, tests                                                      | 0.5-1 day  |

**MVP (about 3-4 days):** top ~300 canonical models via overrides, `/cars/:make/:model` only (no year level), "In Ukraine" stats
plus existing sections, one sitemap file. Widen only after Search Console shows indexing.

First action: SQL check of how the top 300 models fold (rollout step 1 in catalog-plan.md). It decides whether Step 1 is 2 or 4
days. Seed CSV: `export:catalog:csv` only if the overrides output needs to ship (CLAUDE.md "Seed CSVs").

- [ ] Phase 2 internal links: plate/VIN cards ("All 2015 BMW X5 in Ukraine"), `/stats` model boards, footer, model page ⇒ year
      chips and siblings. Without them crawlers find new pages slowly
- [ ] `Dataset` / `FAQPage` JSON-LD where it matches real page content
- [ ] Submit sitemap chunks gradually, watch Search Console coverage before raising the page count

## Phase 3: outreach (right after the MVP, so there is something concrete to link)

Read each community's self-promotion rule first. Reply to every comment in the first hours. Do not cross-post the same text
into many subs at once. Use a screenshot or short GIF of a search.

| Where                                                              | Why                                     |
| ------------------------------------------------------------------ | --------------------------------------- |
| Ukrainian car groups (Telegram, Facebook), r/Ukraine, r/ukraine_ua | Core users                              |
| r/UsedCars, r/Cartalk, r/whatcarshouldIbuy                         | Buyers of cars imported from Ukraine/EU |
| r/SideProject, r/webdev, r/opensource, Show HN                     | Technical audience, links and stars     |
| Habr, DOU.ua, dev.to                                               | Long-lived articles, real backlinks     |

### Draft post (English; verify every claim against the live app and `legal-and-monetization.md` before posting)

> **Title:** I built a free tool to check a Ukrainian car by plate or VIN, using only open government data
>
> I was tired of paid, opaque "check the car" services, so I built one on top of what Ukraine already publishes openly on
> data.gov.ua.
>
> **What it does**
>
> - Type a Ukrainian plate and get the registration history the open registry has: make, model, year, color, fuel, region,
>   and past registrations.
> - Type a VIN and it decodes the vehicle (via NHTSA), useful for cars imported from the US.
> - Point your phone camera at a plate and it reads it.
> - Works offline as a PWA. Ukrainian, Russian and English.
>
> **What it does not do:** it shows no owner personal data, only what is published as open data.
>
> **How it's built (for the devs):** pnpm monorepo, NestJS + Fastify, React 19, Postgres loaded from the CKAN open datasets,
> about 25M rows ingested with header-driven CSV mapping.
>
> Link: https://carsua.app. Feedback welcome, especially on plates where the data looks wrong or incomplete.

- [ ] Ukrainian version (Telegram/Facebook) and a longer Habr/DOU write-up (data-engineering angle: open data, PWA, ALPR)

## Social channels (assessment 2026-11-01, from general knowledge, not measured: check against Search Console / Cloudflare analytics)

The audience is not confirmed yet. First step: read the country, language and landing-page split in the analytics, then pick one or two channels.

| Channel | Worth it? | Notes |
| --- | --- | --- |
| Telegram (groups, then a bot, then maybe a channel) | **Yes, first** | The main messenger and news source in Ukraine; car-buying chats are where the use case is. Join, help first, share once per group, read the rules. A channel (`@carsua_app`) only for release / data updates; a group only after repeat users appear. Bot: PLAN.md backlog |
| Facebook groups | **Yes** | Older, car-buying audience; many local and model-club groups. Same rule: one post per group, read the self-promotion rule. Page itself is low value |
| YouTube | Later | Strong for "how to check a car before buying" tutorials and screen recordings; slow to build but long-lived and searchable |
| Viber | Skip | Used for private chats and communities, no discovery, hard to share into |
| Instagram | Skip for now | Reels with a plate-check demo could work, but needs steady content; low link value |
| TikTok | Skip for now | Short demo videos ("check this plate"), reach is random, needs a content habit |
| Threads / X | Skip | Small Ukrainian audience, little use case |
| Reddit | Selective | r/SideProject, r/webdev, r/opensource for the technical audience; links are `nofollow` |
| Habr | Optional, later | Russian-language, mixed reputation among Ukrainians; decide after the audience data. DOU.ua and dev.to come first |

- [ ] Check analytics for audience (country, UI language, top pages) before posting anywhere beyond Telegram / Facebook car groups
- [ ] Pick 5-10 Telegram and Facebook car-buying groups (search: `авто з пробігом`, `автопідбір`, `авто з Європи`, model clubs), read the rules, post once each with a screenshot
- [ ] Telegram bot: see PLAN.md backlog

## Order of work

1. Phase 0 (today), 2. catalog MVP with IndexNow and internal links, 3. outreach, 4. the rest of Phase 1, then widen the catalog.

## Next (updated 2026-10-30, end of day)

Catalog MVP, internal links, `/cars` + `/cars/:make` hubs, JSON-LD, Cloudflare rules, Search Console / Bing and IndexNow are **done and live**; the done / left list is [catalog-plan.md](catalog-plan.md) "Done and left" (the old night-of-2026-10-30 owner / agent checklist that stood here is obsolete).

Still open from this plan:

1. **Owner, about 2026-11-13:** Search Console "Pages", Bing, `/cars/*` cache hit ratio (target 90 % or more); then year pages (block 4) and widening the index.
2. **Owner, Phase 0 outreach:** Diia / data.gov.ua listing + forum post, directories, re-scrape `/stats` in the Facebook debugger.
3. **Agent:** quality pass on the taxonomy beyond the top 300 (`catalog-overrides.csv`) before raising `CATALOG_TOP_MODELS`; optional shared `ModelSections` extraction; shorten the over-long `/read/*` titles in `spa-text.ts`; split the IndexNow request into batches past 10,000 sitemap URLs.
4. **Compare pairs** as indexable pages are tracked in [compare-plan.md](compare-plan.md) phase 4.

## Measuring

Search Console: indexed pages vs sitemap count, impressions for `/cars/*`; PostHog: referrers from Reddit/Telegram/Habr;
re-run the Lighthouse SEO and agentic audits after each phase (see the last entries in `plan-done.md`).
