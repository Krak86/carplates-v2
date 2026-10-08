# Feature conventions reference

Moved out of CLAUDE.md to save tokens each session. Read only the section for the feature you're touching.

## VehiclesDB cross-market data

Files: `packages/shared/src/vdbMatch.ts` + `vdb.ts`, `apps/api/src/vdb/`, web `components/VdbChips.tsx`,
`routes/stats/VdbStatsPanel.tsx`, `scripts/src/vehiclesdb*.ts` + `vdb-stats.ts`; migrations 0039 `registry.vdb_models`, 0040
`registry.stats_vdb` (+ 0046 `vehicle_kind`: car/motorcycle/truck/bus; `vdbVehicleClass` maps the registry `kind`, `vdbCatalogKinds` limits catalog kinds).

CC BY 4.0 catalog of makes/models with the countries they are sold in and a popularity decile, used for the result-card chips
(top chip row) and the `/stats` Markets panel. A separate, removable block — credit "Vehicle data by VehiclesDB" on About. The
registry↔catalog link is only the `make_key`/`model_key` strings (no FK); matching is TypeScript (`matchVdbModelAcrossMakes` →
`matchVdbModel`, one code path for API/chips/rollup; curated `MODEL_ALIASES` / `CROSS_MAKE_ALIASES` (Renault Dokker → Dacia) only
for pairs verified in both sides; a miss hides the data). The seed CSV stores
the computed keys, so after changing `makeKey`/`modelKey`/`brandSlug` re-run `ingest:vehiclesdb` from the download, not `:csv`.
`stats_vdb` is stale until `pnpm db:refresh-derived`. Full status, gaps and refresh rules: DATASETS_PLAN.md ("VehiclesDB — built").

## RDW specs (EU / NL)

Files: `packages/shared/src/rdw.ts` (contract, own file) + `rdwMatch.ts`, `apps/api/src/rdw/`, web `components/RdwSpecs.tsx` +
`.helpers.ts`, `scripts/src/rdw.ts` + `rdw-parse.ts`; migrations 0047 `registry.rdw_specs` + 0048 (stage C2 columns).

CC0 data from RDW (Dutch vehicle authority): power, engine capacity, unladen and gross mass, combined CO2, top speed, towing limits, seats, doors, wheelbase and length/width/height as min / median / max per
(kind, make, model, first-registration year) — the "Specs" result-card block, labelled "EU (NL) data" (EU-spec, may differ from a
Ukrainian build). RDW's SODA server does the work: `ingest:rdw` posts one grouped, server-side-joined query per make (main
dataset `m9d7-ebf2` LEFT JOIN fuel/emissions dataset `8ys7-d773` on kenteken, first fuel row only) — the ~17M raw rows are never
downloaded. Power/CO2 live only in the fuel dataset and are TEXT columns there (cast with `::number`); EVs report power in
`netto_max_vermogen_elektrisch`; CO2 is WLTP where present, else NEDC. Each measure is plausibility-bounded in the query so a typo row
can't become a min/max. Matching is the VehiclesDB matcher (`matchRdwModel` → `matchVdbModelAcrossMakes`, widened to
`ModelReferenceRow`) over distinct RDW models, then `pickRdwYear` (nearest year within `MAX_YEAR_GAP`); a miss hides the block. Groups of 3-9 vehicles (`RDW_MIN_DISPLAY_N` = 10) are still shown but flagged "small sample" (owner: more info beats less); matching and year picking prefer well-sampled models/years and only fall back to thin ones (a stray thin spelling must not shadow the real one).
RDW `voertuigsoort` → kind: Personenauto=car, Bedrijfsauto=truck (vans), Motorfiets=motorcycle, Bus=bus; trailers etc. skipped.
Stage C2 measures live in the main dataset (no join); lengths are cm. Length/width/height/top speed are filled for only ~30-40 % of cars, so their aggregates run over the vehicles that have the value, `*_n` stores how many, and the API (`partial()`) hides a row built from fewer than `RDW_MIN_DISPLAY_N` (10) such vehicles. The contract fields are `.nullable().optional()` and `SPEC_ROWS` picks use `?? null` — cached pre-C2 answers have no such keys. Stage C3 adds the Dutch NEW list price (incl. 21 % VAT and BPM — labelled so; also ex-tax and BPM rows), kerb mass, cylinders, combined consumption, EV kWh/100 km and range, noise, and four categorical measures stored as jsonb `[value, count]` pairs with a `*_n` (fuel mix: petrol/diesel/ev/hev/phev/gas; top-3 colours, body types, energy labels) — the API returns shares and hides them under `RDW_MIN_DISPLAY_N`; the UI shows classes >= 2 % as chips (`RdwShareRow`, `SHARE_ROWS`). `openRecallShare` is still ingested and in the contract but NOT shown in Specs (reserved for a future Recalls section; model-level wording only, never "this car"). All new contract fields are `.nullable().optional()`, read with `?? null`. The fuel join takes row 2 for hybrids whose first fuel row is electricity (`FUEL_ROW`). The gross-mass row shows the registry's `totalWeight` under it.
UI: collapsible block, the "Typical figures … Similar vehicles" footnote on top, rows grouped into 📂 folder sub-sections (`VinToggleSection`, Engine open by default; `SPEC_GROUPS`: engine, mass, body, price, the NL-fleet chips, then consumption & emissions last, next to the Emissions section); rows carry a `powertrain` and `appliesToFuel(…, fuel)` hides electric rows for combustion cars and vice versa. Per-row ❓ explainers, brackets (hp / litres / tonnes), a "this car (registry)" comparison line, share link `?section=specs`, approximate vehicle count, and a small-sample ⚠️. Rows come from `SPEC_ROWS` (`RdwSpecs.helpers.ts`) — a new measure is one entry. The Emissions section (`FuelEconomy.tsx`) sits right after Specs and falls back to RDW CO2 (labelled, same score scale) when EPA/EEA has no estimate; the score is CO2/300 g/km capped at 100, a scale not a percentage.
Two RDW spellings that share a key collapse to the larger group (medians don't merge). Seed: `seed-data/rdw-specs.csv.gz`; after
changing `makeKey`/`modelKey`/`brandSlug` re-run `ingest:rdw` (cached per make in `scripts/.data/rdw/`, `--refresh` to re-query), not `:csv`.

## Test-drive racer

Files: `apps/web/src/lib/racer/`, `components/game/`; docs/plan-done.md "Test-drive racer game". Follow-ups: PLAN.md "Test-drive racer game".

Desktop-only, online-only game in a modal, opened from the promo banner beside the result card. Engine ported from javascript-racer
(MIT) — **never import its sprites/music (OutRun-derived / licensed to that project)**; cars are rear-view renders of CC0/CC-BY 3D
models (Sketchfab CC-BY sedan/hatch/sport/SUV/pickup/van/bus/motorbike; Kenney Car Kit CC0 for the taxi/police/ambulance/fire/garbage
specials — all credited on About; **check `asset.extras.license` in a GLB before using it: "SKETCHFAB Standard" and CC BY-NC are not
allowed**) tinted through a body mask (the body only needs to be its own material, textured is fine) (`lib/racer/vehicle-assets.ts`,
files in `lib/racer/assets/`, built by `scripts/racer-render/` with no Blender); the photo backdrops (the owner's own photos) are lazy
per id (`backdrop-assets.ts`, `lib/racer/backdrops/`); trees, signs and sound stay procedural. Steering sprites are mirrored per model
family — see docs/plan-done.md "Racer art pass". The engine is a dynamic-imported chunk (import it only with `import type` elsewhere)
and `RaceGameModal`/`engine` chunks are `globIgnores`d from the PWA precache. Settings are shareable via `?section=race&tab=…`
(`encodeRaceConfig`/`decodeRaceConfig`, validated); without a share link scenery, backdrop, lanes, traffic and resolution start
random on every opening (`randomScenery`/`randomBackdrop`/`randomLanes`/`randomTraffic`/`randomQuality` in `config.ts`). The HUD
shows speed only (the lap readout is hidden; lap timing still runs in the engine). Update `RACER_SIZE_KB` after big changes (470
now: sprites ~365 KB + one ~100 KB backdrop + the engine).

## Accounts

Files: `apps/api/src/auth/`, `features/`; web `components/auth/`, `routes/features|admin/`.

User data lives in the separate `app` Postgres schema (migration 0034) — never mix it into `registry`, and treat it as the one part
of the DB that is **not** re-ingestable. Own thin auth: Google ID token verified locally → httpOnly `carsua_sid` cookie, only its
SHA-256 in `app.sessions`. Admins are granted by SQL only (`UPDATE app.users SET role='admin' …`); never add an API that grants
roles. The account contract is `packages/shared/src/account.ts`, **not** `schemas.ts` (that file's hash busts users' offline
caches). Account UI is online-only: `useSession()` reports anonymous while offline, query keys `auth|account|admin` stay out of
`lib/offline-cache.ts`, and the account chunks are `globIgnores`d from the PWA precache (add new ones there too). Controllers use
`SessionGuard`/`AdminGuard` + `@CurrentUser()`; cookies are set via `WithSessionCookie`, not `@Res()`.

**Favorites/history sync** (`apps/api/src/sync/`, `use-saved-sync-actions.ts`): IndexedDB stays the source of truth, deletes are
tombstones (`deleted: true`, 30-day TTL), conflicts = newest `date` wins per `kind:value`, lists capped at `FAVORITES_LIMIT` 100 /
`HISTORY_LIMIT` 200 (oldest dropped, no age expiry). Table `app.user_saved_entries`.

**Settings** (`/settings`, tabs; `apps/api/src/settings/`, `store/settings-store.ts`, `use-user-settings-actions.ts`): one JSON
document per user in `app.user_settings` (migration 0036), schema `userSettingsSchema` in `account.ts` — new tabs add fields there.
localStorage (`carplates.user-settings`) is the working copy; sync is whole-document last-write-wins by `updatedAt`. Holds the
default layer, saved streams (auto-saved when a stream is picked in the layers panel) and ≤ 5 background presets; the active preset
(or built-in defaults) is pushed into `useBackgroundStore` for signed-in users only.

**Admin Statistics** (`/admin?tab=stats`; `apps/api/src/usage/`, migration 0038): a global `UsageInterceptor` logs plate/VIN/photo
lookups and sign-ins into `app.usage_events` (kind, UI language, found, has-cookie — **never** the plate/VIN, IP or user id);
`GET /api/admin/stats` aggregates it, `GET /api/admin/analytics` proxies PostHog HogQL (10 min cache; needs
`POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID`, optional `POSTHOG_API_HOST`, `SENTRY_ORG_SLUG` for the link). Add a new counted
route in `ROUTE_KINDS` + `USAGE_KINDS` (`account.ts`) + the `admin.stats.kind.*` i18n keys.

`GOOGLE_CLIENT_ID` is documented in `apps/api/.env.example`. `/features` is the paid-feature toggles route (FEATURES_PLAN.md wants
it too — see PLAN.md Phase 5).
