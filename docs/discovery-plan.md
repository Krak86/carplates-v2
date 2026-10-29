# Discovery plan: crawlers, search, other sites, users

Status: **planned 2026-10-29, nothing started.** One checklist for "how do crawlers, other sites and users find carsua.app".
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

- [ ] Google Search Console: verify the domain via DNS, submit `/sitemap.xml`, request indexing for `/`, `/stats`, `/read`
- [ ] Bing Webmaster Tools: import from Search Console, submit the sitemap
- [ ] **Diia Open Data services catalog** (backlink from the source itself): https://diia.data.gov.ua/services has an
      "Додати сервіс" button (needs "Зареєструватись" / "Увійти"; the form is behind login, so its fields are unverified).
      Categories: Інформаційно-аналітичні системи · Візуалізації · Чат-боти · Мобільні застосунки. Pick "Інформаційно-аналітичні
      системи". Also post an impact story on https://forum.data.gov.ua (Обговорення). Listing text to paste, adjust to the
      form's limits (text below).
- [ ] Directories: Product Hunt, AlternativeTo, awesome-lists for open data / Ukrainian tech
- [ ] Cloudflare cache rule for `/cars/*` and `/api/catalog/*` (add once the routes exist)

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

- [ ] **IndexNow** (about 1 h): API pings Bing/Yandex/Seznam on content change; key file served from the web root; env var ⇒
      `env.ts` + `deploy-api.yml` + `deploy.md`
- [ ] **Press/About facts page** (about 2 h): what it is, data sources, update dates, logo pack, contact email. New public
      route ⇒ `ROUTE_TITLE_KEYS` + `STATIC_PAGES` (ua/ru/en) per CLAUDE.md
- [ ] **Open stats download** (about 0.5 day): aggregated CSV/JSON (top models, registrations per region and month), CC
      license, no plate-level rows. Cited by journalists and bloggers
- [ ] **Embeddable badge / "check a plate" widget** (about 1 day): each embed is a backlink; keep it iframe-free if possible
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

## Order of work

1. Phase 0 (today), 2. catalog MVP with IndexNow and internal links, 3. outreach, 4. the rest of Phase 1, then widen the catalog.

## Measuring

Search Console: indexed pages vs sitemap count, impressions for `/cars/*`; PostHog: referrers from Reddit/Telegram/Habr;
re-run the Lighthouse SEO and agentic audits after each phase (see the last entries in `plan-done.md`).
