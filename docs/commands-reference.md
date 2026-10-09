# Commands reference (ingest / data / ALPR)

Moved out of CLAUDE.md to save tokens each session. Read the relevant section only; grep, don't read whole.

## Ratings (safety / fuel)

```bash
pnpm ingest:euroncap   # scrape/refresh Euro NCAP ratings (no public API — see PLAN.md)
pnpm ingest:euroncap:csv   # load real Euro NCAP ratings from the committed CSV — seconds, no scraping
pnpm export:euroncap:csv   # re-dump the DB table to that CSV — run after every real re-scrape
pnpm ingest:jncap      # scrape/refresh JNCAP (Japan, NASVA) ratings (no public API — see PLAN.md)
pnpm ingest:jncap:csv  # load real JNCAP ratings from the committed CSV — seconds, no scraping
pnpm export:jncap:csv  # re-dump the DB table to that CSV — run after every real re-scrape
pnpm ingest:cncap      # ingest C-NCAP (China, CATARC) ratings via its own JSON API — see PLAN.md
pnpm ingest:cncap:csv  # load real C-NCAP ratings from the committed CSV — seconds, no fetching
pnpm export:cncap:csv  # re-dump the DB table to that CSV — run after every real re-ingest
pnpm ingest:kncap      # ingest KNCAP (Korea, MOLIT/KoROAD) ratings via its own JSON API — see PLAN.md
pnpm ingest:kncap:csv  # load real KNCAP ratings from the committed CSV — seconds, no fetching
pnpm export:kncap:csv  # re-dump the DB table to that CSV — run after every real re-ingest
pnpm ingest:iihs       # scrape/refresh IIHS (US, insurance-industry-funded) ratings — see PLAN.md
pnpm ingest:iihs:csv   # load real IIHS ratings from the committed CSV — seconds, no scraping
pnpm export:iihs:csv   # re-dump the DB table to that CSV — run after every real re-scrape
pnpm ingest:fuel      # fuel/CO2 reference data: EPA (fueleconomy.gov zip) + EEA (DiscoData SQL API, 2010+, grouped
                       # server-side) -> registry.fuel_economy; --only epa|eea, --dry-run, --refresh. See PLAN.md
pnpm ingest:fuel:csv  # load the committed fuel CSV (4 MB gz) — seconds, no downloads
pnpm export:fuel:csv  # re-dump the table to that CSV — run after every real re-ingest
```

## Reviews, videos, 3D / 360°, news

```bash
pnpm ingest:infocar   # crawl infocar.ua's brand/model/version catalog (both trees, ~25 min cold, 1 req/s, robots-aware,
                       # HTML cached in scripts/.data/infocar/) -> registry.infocar_versions; --brand kia, --limit N,
                       # --dry-run, --refresh. Links + facts only. See PLAN.md "Car reviews"
pnpm ingest:infocar:csv  # load the committed infocar CSV (85 KB gz) — seconds, no crawling
pnpm export:infocar:csv  # re-dump the table to that CSV — run after every real re-crawl
pnpm ingest:infocar:videos  # crawl infocar.ua's /video/ listings per brand (1 req/s, ~10 s/page, a few hours cold, robots-aware,
                       # HTML cached in scripts/.data/infocar/) -> registry.car_videos (YouTube links + facts only);
                       # --brand toyota, --limit N, --dry-run, --refresh. See PLAN.md "Car reviews"
pnpm ingest:infocar:videos:csv  # load the committed videos CSV (185 KB gz) — seconds, no crawling
pnpm export:infocar:videos:csv  # re-dump the table to that CSV — run after every real re-crawl
pnpm ingest:edrive    # e-drive.com.ua owner posts per make/model/generation (its own JSON API, 1 req/s, ≥1 call per
                       # generation: hours cold) -> registry.owner_posts; --brand kia --model ceed, --limit N, --max-pages N,
                       # --dry-run. Links + facts only
pnpm ingest:edrive:csv   # load the committed e-drive posts CSV — seconds, no crawling
pnpm export:edrive:csv   # re-dump the table to that CSV — run after every real re-crawl
pnpm ingest:sketchfab  # Sketchfab Data API search per infocar-catalog make/model (anonymous, 1 req/s, ~25 min cold, JSON
                       # cached in scripts/.data/sketchfab/) -> registry.car_models_3d (embeddable 3D car models, facts + links
                       # only; shown as the "🧊 3D view" chip/modal on result cards); --brand kia --model ceed, --limit N,
                       # --dry-run, --refresh. Needs ingest:infocar(:csv) first
pnpm ingest:sketchfab:csv   # load the committed Sketchfab CSV — seconds, no searching
pnpm export:sketchfab:csv   # re-dump the table to that CSV — run after every real re-crawl
pnpm ingest:carshow360  # carshow360.net 360° galleries from its gallery sitemap (1-2 requests, no page crawl) -> registry.car_models_360
                       # (shown as the "🔄 360° view" chip/modal on result cards, every generation/trim as a chip); --add-url <gallery url>,
                       # --enrich (slow title fetch, 5 s apart, backs off), --retry-failed (ONLY ids in scripts/.data/carshow360/failed.json,
                       # where every 5xx/52x/timeout is logged), --dry-run
pnpm ingest:carshow360:csv   # load the committed carshow360 CSV (24 KB gz) — seconds, no fetching
pnpm export:carshow360:csv   # re-dump the table to that CSV — run after every real re-ingest
pnpm ingest:winner360  # Winner Imports (stock.winner.ua) dealer-stock interior 360° panoramas: ONE request to its public JSON endpoint -> registry.winner_360
                       # (the "Alt. interior" tab of the 360° modal, viewer = Winner's own /360.php?photo_recid= page, embedded); live inventory, so each run
                       # replaces the set (rows that left the stock are deleted); --dry-run. No CSV seed — re-run on demand
pnpm ingest:topgear   # TopGear UK editorial reviews (topgear.com/car-reviews/<make>/<model>, sitemap -> ~1,040 pages, 1 req/s, ~20-25 min cold,
                       # robots-aware, HTML cached in scripts/.data/topgear/) -> registry.topgear_reviews; --brand kia (TopGear make
                       # slug), --limit N, --dry-run, --refresh. Score + link + meta blurb only. See PLAN.md "Step 2c"
pnpm ingest:topgear:csv   # load the committed TopGear CSV (71 KB gz) — seconds, no crawling
pnpm export:topgear:csv   # re-dump the table to that CSV — run after every real re-crawl
pnpm ingest:news      # poll the RSS feeds listed in scripts/news-sources.json (edit that file to add/disable feeds; `onlyCategories`/`excludeUrls` filter
                       # whole-site feeds by category / link regex) -> registry.news_items, tagged brand/model/year from the headline, robots.txt-checked; idempotent,
                       # run on demand or from a scheduler (every ~6 h; no CSV seed); --source id, --dry-run, --list. See PLAN.md "Step 2d"
pnpm ingest:social    # brand + parent-group YouTube channel uploads from each channel's public RSS feed (no key, no quota, 54 channels = 50 makes + 4 groups, 1 req/s ≈ 1 min)
                       # -> registry.social_posts; channels are SOCIAL_CHANNELS in packages/shared/src/socialChannels.ts (shown in the "Videos" section of result cards, under the infocar model videos
                       # "Official channel" strip; GET /api/social?brand=; prints each feed's real channel title next to the configured name — a mismatch = wrong id);
                       # --channel audi|group:gm, --dry-run, --list. No CSV seed; run daily like ingest:news
pnpm ingest:press     # itc.ua + mezha.ua "test drive" tag listings (Ukrainian listing paged until empty; each article's hreflang
                       # editions fetched too: itc uk+ru, mezha uk+en; ~310 articles, ~10 min cold, 1 req/s, robots-aware, HTML cached
                       # in scripts/.data/press/) -> registry.press_reviews (link + title + blurb per language; brand found in the
                       # titles/tags, model matched at lookup); --source itc|mezha, --limit N, --dry-run, --refresh. Needs ingest:infocar(:csv)
pnpm ingest:press:csv  # load the committed press CSV — seconds, no crawling
pnpm export:press:csv  # re-dump the table to that CSV — run after every real re-crawl
```

## Wikimedia photos, YouTube fallback

```bash
pnpm ingest:wiki-images  # pre-warm registry.wiki_image (Wikimedia hero photos, metadata only; hotlinked): per model ONE Commons title
                       # search + batched imageinfo (50/req) + English lead-image fallback; models >= --min-cars (default 1000),
                       # most cars first, resumable; --brand kia, --limit N, --rps 1|2, --dry-run, --refresh. Every failed request
                       # (429/5xx/timeout) is listed in scripts/.data/wiki-images/failed.json; --retry-failed [--all] replays them
pnpm ingest:wiki-images:csv  # load the committed wiki-images CSV (112k rows, seconds)
pnpm export:wiki-images:csv  # re-dump ok + not_found rows to that CSV — run after every real pre-warm
pnpm wiki-images:coverage    # photo coverage by tier, by group and weighted by registered cars
                             # (the result-card hero reads this table via GET /api/wiki/image; article text = GET /api/wiki, fetched only when the section is opened)
pnpm ingest:youtube-videos   # YouTube Data API fallback for models infocar has NO video for -> registry.youtube_videos (links + facts;
                       # needs GOOGLE_API_KEY in apps/api/.env). Staged like wiki-images: gap models only, most cars first, --min-cars
                       # (default 1000), resumable (registry.youtube_model_runs), stops at --daily-units (default 9000 of the 10,000/day
                       # quota, Pacific day) or on quotaExceeded — re-run daily. --list (gap list + days estimate, no API calls),
                       # --brand/--model, --limit N, --dry-run, --refresh. See PLAN.md "Step 2a"
pnpm ingest:youtube-videos:csv   # load the committed YouTube videos CSV — seconds, no API calls (partial seed from 2026-10-06: 881 videos / 110 models)
pnpm export:youtube-videos:csv   # re-dump the table to that CSV — run after every real run
```

## VehiclesDB, derived rollups, bundles

```bash
pnpm ingest:vehiclesdb   # VehiclesDB (CC BY 4.0) make/model catalog: download dist/vehicles.csv -> registry.vdb_models (markets + popularity
                       # decile; result-card chips via GET /api/vdb); --dry-run, --refresh. See DATASETS_PLAN.md
pnpm ingest:vehiclesdb:csv   # load the committed VehiclesDB CSV (305 KB gz) — seconds, no download (part of ingest:ratings:csv)
pnpm export:vehiclesdb:csv   # re-dump the table to that CSV — run after every real re-ingest
pnpm ingest:rdw   # RDW (Dutch register, CC0) specs -> registry.rdw_specs: min/median/max power, capacity, unladen+gross mass, CO2, top speed, towing, seats, doors, dimensions per make/model/year, aggregated
                  # server-side by RDW's SODA API (one joined query per make, cached in scripts/.data/rdw/; ~1 h cold). Flags: --make SKODA,
                  # --min-vehicles N (default 50), --dry-run, --refresh. Result-card "Specs" block via GET /api/rdw.
                  # Also fills price_by_fuel (migration 0050) for the value panel's per-fuel table; a new aggregate column needs --refresh (~1 h) + export:rdw:csv
pnpm ingest:rdw:csv   # load the committed RDW seed (seed-data/rdw-specs.csv.gz) — seconds, no download (part of ingest:ratings:csv)
pnpm export:rdw:csv   # re-dump the table to that CSV — run after every real re-ingest
pnpm ingest:rdw-recalls   # RDW recall campaigns (CC0) -> registry.rdw_recalls + rdw_recall_models; ~21k small rows read page by page (seconds). --dry-run. Block "Recalls" via GET /api/rdw/recalls
pnpm ingest:rdw-recalls:csv   # load the committed seed (seed-data/rdw-recalls.csv.gz) — part of ingest:ratings:csv
pnpm export:rdw-recalls:csv   # re-dump both tables to that CSV — run after every real re-ingest
pnpm ingest:open-ev   # Open EV Data (MIT) -> registry.open_ev; one ~130 KB JSON, 118 variants (seconds). --dry-run. Block "Electric" via GET /api/ev
pnpm ingest:open-ev:csv   # load the committed seed (seed-data/open-ev.csv.gz) — part of ingest:ratings:csv
pnpm export:open-ev:csv   # re-dump the table to that CSV — run after every real re-ingest
pnpm ingest:rdw-recalls:translate   # local-model (NLLB, GPU) translation of recall texts -> rdw_recall_texts; resumable, --max-minutes N / --limit N --offset N / --make --model / --langs / --dump f.md. See DATASETS_PLAN "Stage D follow-up 2"
pnpm db:refresh-vdb-stats   # rebuild registry.stats_vdb (the /stats "Markets" panel) from the registry + vdb_models
pnpm db:refresh-derived     # rebuild ALL rollups computed from current_registration: fuel-stats + safety-stats + vdb-stats
                            # (scripts/src/derived-refresh.ts — add new rollups of that kind there). `ingest` runs it itself
                            # after the registry refresh unless given --skip-derived; ingest:full refreshes once at its end;
                            # ingest:all skips it in ingest:full and runs it after the CSV loads. ingest:ratings:csv /
                            # ingest:vehiclesdb alone do NOT — run this after them
pnpm db:refresh-weight-stats # rebuild registry.stats_weight (heaviest/lightest models per vehicle group; migrations 0051-0053) from the registry
                             # + rdw_specs (scripts/src/weight-stats.ts); part of db:refresh-derived. Run after a registry or RDW ingest
pnpm --filter scripts build:logo-images   # gitignored apps/web/assets-src/kind/logos/*.png -> public/logos/*.webp (max 700 px, q75); WebP only
pnpm db:refresh-fuel-stats   # rebuild registry.stats_fuel (the /fuel page rollup) from the registry + fuel_economy;
                             # run after any registry ingest or ingest:fuel (ingest:all does it last)
pnpm ingest:ratings:csv   # db:migrate, then all five *:csv rating loads + the fuel, RDW, infocar, infocar-videos, e-drive, sketchfab, carshow360, topgear, press and wiki-images CSVs concurrently — each writes
                          # its own table only, doesn't touch registrations
pnpm ingest:all        # db:migrate, then ingest:full + ingest:ratings:csv concurrently — each writes a
                       # disjoint table (registrations/current_registration/stats_by_* vs. one ratings/fuel_economy
                       # table apiece) — then db:refresh-derived (fuel/safety/vdb rollups), which needs both finished
```

## ALPR (self-hosted plate recognition)

```bash
pnpm alpr:build     # build the self-hosted ALPR (own-model plate recognition) Docker image
pnpm alpr:up        # run it on :8088 (sets ALPR_LOCAL_URL=http://localhost:8088 in apps/api/.env to use it)
pnpm alpr:down      # stop it
node services/alpr/eval.mjs   # run services/alpr/eval/images/* through the running container → eval/results.json
                              # (gitignored photos; rebuild with alpr:build after editing services/alpr/app.py)
```

`services/alpr/` = FastAPI + `fast-alpr` (ONNX, CPU-only, MIT). Also serves `POST /recognize/vin` (RapidOCR lines + boxes; API ranks
them with `extractVins` in `packages/shared/src/vin-read.ts`, WMI table in `packages/shared/src/wmi.ts`) — see docs/plan-done.md
"VIN photo search" and PLAN.md "Own ALPR model".

## First-time setup with real data

`pnpm install && pnpm db:up && pnpm db:migrate && pnpm ingest:full && pnpm ingest:euroncap:csv && pnpm ingest:jncap:csv && pnpm ingest:cncap:csv && pnpm ingest:kncap:csv && pnpm ingest:iihs:csv && pnpm dev`
(hours, ~20 GB). Equivalent: `pnpm install && pnpm db:up && pnpm ingest:all && pnpm dev` — same end state, each ingest writes a
disjoint table; only shrinks wall-clock once `scripts/.data/*.zip` is cached (a fresh clone is bottlenecked on the ~20 GB CKAN download).
