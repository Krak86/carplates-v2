# Wiki photo colour filter + extra photos

Status: **steps 1-2 built 2026-11-06; steps 3-9 open.** Prototype code and findings are in `docs/wiki-recolor/` (read "What the research showed" first).
Tracked in PLAN.md "Wiki photo colour filter". Built-state conventions go to features-reference.md when done.

## Goal

The hero photo of a plate card is a Wikimedia photo of the model, usually in a colour that is not the car's colour (red car, white photo).
Show that photo **with the registry colour applied** (a client-side "colour filter"), clearly labelled and switchable, and add a small strip
of other photos of the model under the hero (same look as the auction lot photos).

## Decisions (owner, 2026-11-06)

- The recolour is a **filter on a photo of another car**, never presented as this car. Always say so in text.
- **Toggle button in the top-right corner** of the hero (on / off), with a **swatch of the filter colour next to it**, plus a **text line** saying the photo has a car colour filter.
- **Skip the filter** when the photo already has that colour (or a close one), when the car is multi-coloured / a wrap / a livery, when the paint is dark or neutral and unreliable, or when no mask exists. Then the original photo is shown, no button.
- Original photo first, the filter **fades in** when its layer has loaded (the photo is the LCP; a failed layer costs nothing).
- **A few more photos at the bottom**, same pattern as the auction photos (`UaAuctionPhotos`): thumbnail grid, "show more", zoom dialog.
- Re-scan Commons for **more candidate photos per model** and prefer the one whose real paint already matches the registry colour (then no filter at all).

## What the research showed (prototype, 2026-11-06)

Code: `docs/wiki-recolor/prototype-*.mjs.txt` (Node + `sharp` + transformers.js, all already deps of `scripts/`).

- **Mask source that works:** `Xenova/segformer-b0-finetuned-ade-512-512` (q8, about 4 MB, 0.4-0.7 s per image on CPU), class `car` only.
  Take the **largest connected component** (bonus if it covers the image centre). Neighbouring cars and road leak otherwise.
- **Paint inside the car mask:** Lab k-means (K=5), choose the cluster by area in the body band (10-62 % of the box height, inner 90 % of the width), dark clusters penalised.
  Then match pixels by **hue + chroma only, ignoring lightness** for coloured paint (body lightness varies a lot), and by a wide lightness band + low chroma for neutral paint.
  Matching colour and lightness in one tight cluster only recolours the lit hood and roof.
- **Recolour maths:** `g = luminance(pixel) / median body luminance`, `out = target * g^0.9`, specular highlights (g above about 1.6) blend to white, edge feathered (blur about 1.1 px at 640 px wide).
- **Skip rule ("close colour"):** nearest of the 11 buckets by dE (`L` weighted 0.6) from the median Lab of the body pixels; keep the original when the target is the same bucket or dE < 13.
  22 was too loose (a mid grey photo counted as white).
- **Gates that must exist:** wrap / livery (saturated pixels spread over many hue bins), two-tone cars (low matched-paint coverage), car area under 8 % or over 92 %, dark neutral paint, multiple big cars.
- **Looks good:** white / silver / saturated bodies (Peugeot 2008, Megane, Octavia, Duster, RAV4, Sportage, Camaro mostly), all 11 colours.
- **Fails or weak:** black and dark grey cars (windscreen reflections read as paint; the Passat was classified white), alloy wheels on silver cars get tinted,
  yellow to black leaves an olive cast, two-tone fleet cars, rally / race cars. These need the gates above or stay unfiltered.
- **Rejected:** `naufalso/segformer-*-carla-car-body-segmentation` (CARLA is synthetic, marks wheels and road as body on real photos); DeOldify / IBM colorizer (black-and-white only);
  Stable Diffusion inpainting + ControlNet (GPU, seconds per image, one stored image per colour, alters details); YOLO car-parts model (licence unknown, Ultralytics is AGPL).
  Untested ideas for the dark-car gap: SAM with point prompts to cut wheels / glass.
- **Candidate scan:** Commons search gives 14+ photos per model. Picking the one whose paint is already right worked for Dodge Avenger (red), Mazda 6 (red), a black Lacetti wagon.
  Problems seen: generation mismatch (search ignores the year), black paint misbucketed, thin pools for rare colours, concept / race cars.

## Colours

11 registry colours (`VEHICLE_COLORS`): gray white black blue red green beige brown yellow orange purple.
`VEHICLE_COLOR_HEX` is a mid-tone **icon** swatch; the filter needs **paint** tones (prototype values, tune by eye):

```
white #f2f2f2  gray #7d8085  black #17181a  blue #1f4fb4  red #c4161c  green #2e7d32
beige #cbb896  brown #5b3a24  yellow #f2c200  orange #f07a10  purple #6a2fa0
```

## Design

### Data (new table, own contract, no change to `schemas.ts`)

`registry.wiki_image_paint` keyed by `image_url` (several `wiki_image` rows can share one file):
`status` (`ok` | `skip`), `skip_reason`, `bucket`, `lab_l/lab_a/lab_b`, `body_area`, `mask_w/mask_h`, `mask` (**bytea**, webp), `algo` (smallint, bump to rescan), `scanned_at`.
The mask is one **RGBA webp, about 640 px wide, 10-20 KB**: RGB = grey shading of the body (`g`), A = paint weight. One mask serves all 11 colours.
No seed CSV (binary, tens of MB); a scan job regenerates it after deploy. Backward-compatible migration (blue/green).

### Client rendering

Not CSS blend modes. Draw to a `<canvas>` (`object-fit: cover`, same box as the `<img>`, so mask and photo align): `rgb = paint * shade`, alpha from the mask, cached per colour. The mask is same-origin, so `getImageData` needs no CORS.
~200k pixels, a few ms. The `<img>` stays as is and the canvas fades in above it.

### API

`GET /api/wiki/recolor?brand&model&year` -> `{ imageUrl, bucket, lab, maskUrl, w, h } | null` (nullable, optional fields; contract in its own file `packages/shared/src/wikiRecolor.ts`, so offline data survives).
`GET /api/wiki/paint/:id.webp` serves the mask, immutable cache. Edge-cache checklist (`docs/checklists.md`), `@Throttle`, Cloudflare cache rule.

### UI (`WikiHeroImage.tsx`, free top-right corner; top-left has the DB / Wiki live label, bottom corners the refresh button and credit)

- Top-right pill: `[swatch] Colour filter: on|off` (`aria-pressed`), swatch = the filter colour. Shown only when a filter is applicable.
- Text line (bottom or under the photo, ua / ru / en, no em dash): "Photo of another car with a colour filter: <colour>". The credit gets "(modified: colour)" because the photos are CC BY-SA.
- Setting persists: `useUiStore` field + `localStorage` `carplates.wikiRecolor` (pattern of `blueprintEnabled`), default on.
- `WikiHeroImage` needs the raw registry colour: `SearchRoute.tsx` and `OtherSourcesFound.tsx` pass it (`resolveVehicleColor`).
- Strip under the hero: `WikiPhotoStrip.tsx`, modelled on `ua-auctions/UaAuctionPhotos.tsx` (`grid-cols-2 sm:grid-cols-4`, `aspect-[4/3]`, `PHOTO_PREVIEW_COUNT`, show more, `PhotoZoomDialog`), originals without filter, credit per photo.

## Steps

Phase A (steps 1-6) is the recolour on the existing hero photo. Phase B (7-8) adds candidates and the strip. Phase C (9) is rollout. Each step ends green (`pnpm format`, lint, tests).

1. **Shared colour model.** `packages/shared/src/paintColor.ts`: `PAINT_HEX`, `labOf(hex|rgb)`, `paintBucketOf(lab)`, `isClosePaint(lab, bucket)` (dE < 13, L weight 0.6), exported from `index.ts`, unit tests incl. the "mid grey is not white" case. `pnpm --filter @carplates/shared build`.
2. **Paint scan core + CLI.** `scripts/src/wiki-paint-core.ts` (pure, tested on a few fixture images: car component, paint cluster, gates, shading layer) and `scripts/src/wiki-paint.ts`
   (`pnpm ingest:wiki-paint --limit N --brand X --rps 1`; reads `wiki_image` rows with `status = 'ok'`, downloads the thumb, writes `wiki_image_paint`). Port from the prototype; `@huggingface/transformers` and `sharp` are already in `scripts/package.json`.
3. **Migration + schema.** `packages/db/migrations/NNNN_wiki_image_paint.sql`, `schema.ts` table, db index export. Checklist "Deploy" (blue/green safe).
4. **API.** `wikiRecolor.ts` contract, `wiki.service` / controller endpoints, cache headers, throttle, tests (store, DTO, 404 / null cases).
   4a. **Shared recolour maths (done).** `packages/shared/src/paintApply.ts` (`applyPaint`, `paintTone`, `paintTargetLinear`, `SHADE_*`) moved out of `scripts/`; the web canvas uses `paintTone` per pixel, a test ties it to `applyPaint`.
5. **Web filter.** `lib/queries.ts` `wikiRecolorQuery` (online only, silent failure), `use-wiki-recolor.ts` (decides apply / skip), `WikiRecolorCanvas.tsx`, button + swatch + text in `WikiHeroImage.tsx`, store flag, i18n ua / ru / en, colour names from the existing colour labels.
   Decisions: online only, no `offline-cache.ts` entry (the filter is decoration, the original photo is the offline fallback); `/api/wiki/recolor` stays out of `PUBLIC_API_PATH_PREFIXES`; the card bundle is unchanged (the client asks `recolor` itself after the hero resolves). Apply the filter only when `recolor.imageUrl` equals the hero `image.url`.
   Tests: skip when close colour, no colour, disabled, mask error; component renders the button only when applicable.
6. **Docs and credits.** `docs/checklists.md` "Docs after a feature": plan-done, PLAN, features-reference section "Wiki photo colour filter", `releases.ts`, About (`FEATURES`, and the CC BY-SA "modified" note under `SOURCES`).
7. **Candidate photos.** `registry.wiki_image_candidate` (brand, model, year span, url, size, title, author, licence, bucket, lab, status, quality), scan `scripts/src/wiki-candidates.ts`
   (Commons search up to 40 results, drop interior / engine / logo / wheel titles, width at least 1000, filter by the year in the title or the generation from `model_generations`, run step 2's analysis),
   API `GET /api/wiki/photos?brand&model&year&color` (best colour match first, then others), hero uses a colour-matched candidate when one exists (no filter then).
8. **Bottom strip.** `WikiPhotoStrip.tsx` and zoom, per-photo credit, lazy below the hero (`LazySection` / `HELPER_GROUPS` checklist if it is a section), tests.
9. **Rollout.** Scan host: needs the SegFormer model download (`scripts/.data/wiki-paint/hf-cache`, about 15 MB q8), a few hundred MB RAM and `sharp`; run it where the other scrape jobs run, one process, `--rps 1`. Orphans: the job also deletes `wiki_image_paint` rows whose `image_url` is no longer in `wiki_image` (`status = 'ok'`). Before turning on for everyone: review a gallery sample of at least 100 (livery / race cars, touching neighbour cars, mottled paint) and tune gates, bumping `PAINT_ALGO`. Cloudflare Cache Rule gets `/api/wiki/recolor` and `starts_with /api/wiki/paint/` (manual, PLAN.md box). Scan order (done): `--order popular` = every model by registry count, most first. Job (done) in `scripts/src/jobs.ts` + `run-ingest.sh` + `infra/vps/ingest.cron` + a `/data-status` row; Commons rate limit (`--rps`);
   set `algo` so a better algorithm rescans; watch the share of `ok` vs `skip` and review a sample gallery before turning it on for everyone.

**Step 7 built (2026-11-09, data + API).** Deviations from the plan text: candidates store **no mask** (bucket + Lab only; a promoted candidate gets one through the normal `wiki-paint` job), `photo_year` replaces the year span (the API maps the car year to a generation through `GenerationsService` at query time, one year of slack, undated photos stay but rank lower), and `wiki_image_candidate_scan` records searched models so a rerun resumes.
Files: `packages/db/migrations/0104_wiki_image_candidate.sql`, `scripts/src/wiki-candidates{,-core}.ts`, `scripts/src/wiki-paint-image.ts` (SegFormer helpers shared with `wiki-paint.ts`), `packages/shared/src/wikiPhotos.ts`, `apps/api/src/wiki/wiki-photos.{controller,service,rank}.ts`.
**Done 2026-11-09 (web, job, strip):** hero picks the first `colorMatch` photo (`use-wiki-photos.ts`, no filter, credit `wiki.imageCreditOther`, falls to the next match, then to the stored hero + filter on a load error; waits for the photo list so it never flashes a replaced photo), `WikiPhotoStrip.tsx` (originals, credit link per photo, zoom, show more; excludes the hero photo), job `wiki-candidates` (80 models per night, cron 01:45), `/data-status` row, deploy.md Cloudflare expression, controller test. Dry-run review and local real scan done 2026-11-09 (see PLAN.md).

**Next session, in order** (steps 7-8 code is done and committed, 2026-11-09: see "Done 2026-11-09" above).

1. Review the ~100-model dry run: `pnpm ingest:wiki-candidates --limit 100 --dry-run` (writes nothing; per model: qualified / analysed / ok / colours). A log from the 2026-11-09 session may exist in its scratchpad (unfinished); otherwise rerun it (about 100 min at `--rps 1`, run it in the background). Look for models with 0 qualified, mostly `skip`, or one colour only; tune `wiki-candidates-core.ts` (title filters, `candidateQuality`) and bump `PAINT_ALGO` only if the paint gates change.
2. Real scan of a small sample on the local DB (`--limit 10`, no `--dry-run`), then check in a browser on a real plate: matched hero (credit says another car, no pill, no refresh button), strip below (credit links, zoom, show more), and a model with no match keeps the stored hero + filter. Not yet browser-checked.
3. Owner / deploy: migration 0104 on the VPS, `/api/wiki/photos` in the Cloudflare "Cache model lookups" rule (MISS then HIT), first nightly `wiki-candidates` run (cron 01:45) visible in `registry.job_runs` and `/data-status`.
4. About page: `FEATURES` / `SOURCES` entry (ua / ru / en) once the first scan has run on the VPS; tick the PLAN.md boxes.
   Local DB: migration 0104 applied, only `kia ceed` scanned (8 rows); shared and db are rebuilt. Nothing is committed.

## Risks and open questions

- Dark / neutral paint is the weak spot; the gates decide how many cars get a filter at all (my guess, unverified: about 40-50 % of photos). Everything else shows the original photo.
- The photo is a different car and often a different generation; the text must never imply otherwise.
- Licence: CC BY-SA derivatives need attribution and a "modified" mark.
- Mask storage as bytea: check the size after the first scan; move to files + a cache rule if it grows past a few hundred MB.
- `object-fit: cover` crops the photo; the canvas must use the same box, so cover it in a test.
- Unknown: how many `wiki_image` rows are `ok` (run `SELECT count(*) FROM registry.wiki_image WHERE status = 'ok'`) and how many share a file.

## Handoff

**Done (steps 1-2).** `packages/shared/src/paintColor.ts` (+ test, exported, shared rebuilt). `scripts/src/wiki-paint-core.ts` (pure `scanPaint`, `applyPaint`, `carComponents`, `gaussianBlur`; constants `PAINT_ALGO` = 2 (bumped 2026-11-07), `PAINT_SCAN_WIDTH` = 640, `SHADE_SCALE`) and `scripts/src/wiki-paint.ts`
(`pnpm ingest:wiki-paint --limit N --brand X --random --rps 1 --out DIR`: read-only on the DB, writes results.json + mask webp + recolour preview to `scripts/<DIR>`). Tests use synthetic fixtures built in code.

**Mask contract (steps 3-5 must honour it).** RGBA at the scan size: RGB = shading `min(g, 3) * 255 / 3` (decode `g = byte / SHADE_SCALE`), A = paint weight. Client maths = `paintTone` / `applyPaint` in `packages/shared/src/paintApply.ts` (moved out of `scripts/` in step 4a; `wiki-paint-core.ts` re-exports them): `out = target * g^0.9`, highlights above g 1.6 blend to white, composited by alpha.
`scanPaint` returns `{status:'ok', bucket, lab, paintLab, bodyArea, paintShare, mask}` or `{status:'skip', reason, bodyArea}` (reasons = `PAINT_SKIP_REASONS`). The target-dependent skip (`isClosePaint(lab, target)`) is decided at runtime, never stored.

**Gate tuning.** Random samples of 50 photos: `ok` fell from about 83 % (prototype gates) to about 56 % after the glass-band lightness match, `dark_paint` (cluster L < 32), `dark_body` (mid body band median L < 34 and chroma < 18) and `MIN_PAINT_SHARE` 0.20.
Still weak: mottled specular paint (lime Lamborghini, Camaro), a touching neighbour car can be tinted, race / livery cars have no dedicated gate. After any algorithm change re-scan a sample and bump `PAINT_ALGO`.

**Done (steps 3-4, uncommitted).** Migration `0101_wiki_image_paint.sql` (table + unique index on `md5(image_url)`), `schema.ts`, db helpers `wikiImagePaint.ts` (`findWikiPaint`, `findWikiPaintMask`, `wikiPaintMaskId`), CLI upsert (skip rows stored, rescan `algo` < PAINT_ALGO, `--dry-run`).
Mask encoding `MASK_WEBP` (quality 50, alpha 60, effort 6) = about 24 KB per mask (quality 80 was 62 KB); about 300 MB projected for 22,300 files, so bytea stays. Sample of 30: 20-22 `ok`.
API: `packages/shared/src/wikiRecolor.ts`, `apps/api/src/wiki/wiki-recolor.{service,controller}.ts`, `wiki-paint.store.ts`.

- `GET /api/wiki/recolor?brand&model&year` -> `{ recolor: {imageUrl,bucket,lab,maskUrl,w,h} | null }` (wrapped: Nest answers a bare null with an empty body). Stored rows only (`WikiService.peekImage`), no network. `LOOKUP_CACHE`.
- `GET /api/wiki/paint/<md5>.webp?v=<algo>` -> mask, `immutable` 1 year (`?v` busts it after a rescan). `WIKI_RECOLOR_THROTTLE`.
- Cloudflare rule in `docs/deploy.md` extended (needs the manual edit in the dashboard).

**Step 4a done:** shared `paintApply.ts` + test (`paintTone(shadeByte, paintTargetLinear(colour), k)` per pixel for the canvas, composite over the photo with the mask alpha).

**Done: steps 5-6 (web filter, docs; uncommitted).** `useWikiRecolor` + `wiki-recolor.helpers.ts` + `WikiRecolorCanvas` + pill / note / credit in `WikiHeroImage`, store flag, i18n, About / releases / features-reference / plan-done. Skips: no colour, close paint, other photo, request or mask error; lot-photo heroes never filter. Mask is fetched only while the filter is on. Gates green: format, lint (0 errors), tsc web, 326 test files. **Not browser-checked** (no scanned rows locally): run `pnpm ingest:wiki-paint` on a few models, open a plate, check alignment, fade and the pill.

**Done: browser check + step 9 code (2026-11-06, uncommitted).** Step 5 checked in Chrome on Audi A1 2012 (white photo): red plate gets the filter (canvas box = `<img>` box, cover, fade 0.3s, pill, credit "modified: colour", note), toggle persists in `carplates.wikiRecolor`, no mask fetch while off, a white plate of that year shows nothing; nothing to fix. Rollout: job `wiki-paint` (nightly 00:30, `--limit 1500 --rps 1`, timeout 120 min), `SCHEDULE.md` row, `HC_PING_WIKI_PAINT`, `/data-status` row, CLI `--order popular|url|random` (default popular via `stats_by_model`), orphan cleanup (`--keep-orphans` opts out), contact sheets with `--out`. Hero / web code was not touched in this round (owner asked to leave it alone while working in parallel).

**Gallery review (owner).** Sample: `pnpm ingest:wiki-paint --limit 100 --order random --rps 1 --dry-run --out .data/wiki-paint/review-2026-11-06` -> `scripts/.data/wiki-paint/review-2026-11-06/sheet-N.jpg` (+ results.json). Look for livery / race cars, touching neighbour cars, mottled paint; do not tune gates before the owner has seen it.

**Review sample result (2026-11-06, algo 1, 100 random photos, dry run, nothing saved; 6 sheets).** 47 ok, 53 skip: dark_body 21, low_coverage 14, dark_neutral 7, no_car 5, car_too_small 3, dark_paint 3. **Timing (timing note):** 4.4 min for 100 photos = 2.6 s per photo at `--rps 1` (download + SegFormer + mask encode on this PC), so the nightly batch is 1 500 photos (about 65 min, timeout 120 min); 22 300 files = about 15 nights. The scan is stopped; nothing is running.

**R1 findings (sample numbers = sheet labels, algo 1).**

- **Bad tints, 12 of 47 ok (about 25 %):** two-tone or partial paint from a wrong paint bucket on dark / teal / dark-blue cars: 020 (black Mercedes SL, bucket white), 022 (blue BMW Z3 roadsters, bucket white), 078 (dark blue Mercury, bucket gray, only hood and roof tinted), 098 (teal car, bucket gray, top red and lower body stays teal), 010 (blue Mazda, lower body stays blue-green), 088 (dark grey Honda Odyssey, lower body stays dark). Livery / race / police: 019 (striped van, area 0.089, only the roof tinted), 058 (race 911), 064 (Chinese police car). Neighbour spill: 008 (two touching cars both tinted), 086 (tint bleeds onto the bus behind). Mottled / rusty: 094 (rusty beige van, red patches).
- **Wrong skips, about 16 of 53:** `low_coverage` 003 (beige Elgrand), 044 (clean blue Sentra), 050 (silver Jeep), 052 (red CX-30), 055 (light blue XV), 061 (blue Q5), 099 (grey Alfa), 081 borderline; `dark_neutral` 011 (silver Astra), 026 (clearly red Fiesta), 087 (silver X3), 041 borderline; `dark_body` 031 (white VW up, rear), 072 (red Ka in shade), 097 (two blue small cars), 092 (dark red RX); `dark_paint` 071 (bright blue van with livery); `car_too_small` 085 (blue Trafic fills about 40 % of the frame). Correct skips: black / very dark cars (002, 009, 013, 023, 033, 036, 038, 062, 063, 065, 070, 073, 091, 096, 100), no_car (006, 075, 076, 095), trucks / buses (027, 042), race cars (029, 080), livery (005).
- **Good:** white / silver / saturated cars from a clear 3/4 view (001, 021, 025, 032, 035, 037, 039, 043, 049, 051, 056, 069, 074, 077, 083, 089, 090, 093); yellow cars become orange (040, 067, an acceptable result for a red target).
- **Hypotheses for R2 (unverified):** (1) `low_coverage` and `dark_neutral` reject clean saturated or silver paint, so thresholds look too strict or the share is computed against glass-heavy masks; (2) wrong buckets on dark blue / teal come from the cluster picking reflections or the grey lower body; add a paint-cluster chroma / consistency gate that skips instead of mis-tinting; (3) livery needs a gate (several clusters, low single-colour share, or bodyArea < 0.15); (4) neighbour spill needs the car component closest to the centre only. Re-run the same 100 photos after each change and compare sheets.

**R2 round 1 (2026-11-06; code in `wiki-paint-core.ts`, `PAINT_ALGO` still 1).** Changes: (1) saturated-cluster re-pick: when the chosen paint cluster is neutral but the body band median chroma is >= 20 (`SATURATED_BAND_CHROMA`), the strongest cluster with chroma >= 25 and L >= 30 is used (blue / red cars whose bright patches clustered as grey); (2) hue-angle match as a second path of the coloured paint weight (`HUE_SIGMA` 0.25 rad, `HUE_MIN_CHROMA_RATIO` 0.45), because saturated paint keeps its hue but not its chroma between lit and shaded panels; (3) new skip reason `two_tone`: share of the lower body (40-72 % of the car box height) matching the paint < `MIN_LOWER_BODY_SHARE` 0.24; (4) `MIN_PAINT_SHARE` 0.20 -> 0.18; (5) `DARK_BODY_CHROMA` 18 -> 15 (every black car in the sample has mid-band chroma <= 12.2; two coloured cars in shade had 16.6-16.8). Tried and dropped: `DARK_PAINT_L` 38 (skips ordinary blue, L about 36-38), a paint-vs-body lightness gap gate (good photos 15, 54, 57 have the same gap as bad ones). `scanPaint` also takes an optional `debug` object (intermediate numbers) for the tuning harness.
**Result on the same 100 photos (SegFormer output cached, JPEG-reencoded originals, so the baseline is 50 ok instead of 47):** 53 ok. Fixed: 026 (red Fiesta, bucket red), 044 (blue Sentra, bucket blue), 071 (blue livery van, tinted with lettering kept), 003 (beige Elgrand, soft tint), 087 (silver X3); skipped now instead of mis-tinted: 019, 022, 060, 068 and the black 059; yellow cars (040, 067) get a clean red instead of orange; all 20 good photos kept. Residual bad tints: 004 (street scene with several cars), 008 (touching cars), 010 (blue Mazda, two-tone), 020 (reflective black Mercedes), 058 / 064 (race / police livery), 094 (rusty van), 098 (teal). Residual wrong skips: 050, 055, 061 (now `two_tone`, the conservative trade: a clean blue Q5 is lost to keep a half-tinted dark blue car out), 011, 031, 052, 072. Sheets: `scripts/.data/wiki-paint/review-2026-11-06-algo2/sheet-1.jpg` ... `sheet-6.jpg` (before: `review-2026-11-06`). Harness (gitignored, cached probs): `scripts/.data/wiki-paint/tune.ts` (`OUT=dir npx tsx .data/wiki-paint/tune.ts [photo numbers]`, run from `scripts/`). The labelled lists in it are my own review of 100 photos: expect some overfitting; the real check is a fresh random 100 after the owner agrees.

**Remaining work, in steps (the scan is paused: nothing runs on the local DB or the VPS until step R2 is decided).**

- **R1. Gallery review (DONE 2026-11-06, by Claude at the owner's request; findings in "R1 findings" below).** Open `scripts/.data/wiki-paint/review-2026-11-06/sheet-1.jpg` ... (100 photos, red preview beside each original; `results.json` has the numbers). Note livery / race cars, touching neighbour cars, mottled paint, wrong skips (`dark_*`, `low_coverage`, `car_too_small`). Output: a list of photo numbers per problem.
- **R2. Gate tuning (first round DONE 2026-11-06, uncommitted; `PAINT_ALGO` NOT bumped yet, waits for the owner; see "R2 round 1").** Change gates in `wiki-paint-core.ts`, re-run the same sample (same `--out` style, new dir), show before / after sheets, bump `PAINT_ALGO` once the owner agrees. Rescans are automatic (rows with an older `algo`).
  - **R2b (owner):** look at `scripts/.data/wiki-paint/review-2026-11-06-algo2/sheet-1.jpg` ... `sheet-6.jpg` and accept or name photos to chase.
  - **R2c (Claude, after R2b):** bump `PAINT_ALGO` to 2, run a fresh random 100 (`pnpm ingest:wiki-paint --limit 100 --order random --rps 1 --dry-run --out .data/wiki-paint/review-algo2-fresh`, about 5 min), show the sheets with full paths, report ok share and new bad tints (overfitting check). The tuning harness uses the cached probs of the first 100 only.
  - **R2d (optional):** another round for residual bad tints (touching cars, livery, rust, teal) if the fresh sample says they matter.
- **R3. Local backlog (optional).** `pnpm ingest:wiki-paint --limit 500 --rps 1` writes real rows locally for browser checks; real timing per photo is in the `took` line of the scan output (see the timing note below).
- **R4. Deploy (owner).** Apply migration 0101, merge, `deploy-ingest` installs the cron (nightly 00:30 `wiki-paint`), Cloudflare Cache Rule (`/api/wiki/recolor`, `starts_with /api/wiki/paint/`), optional `HC_PING_WIKI_PAINT` secret + healthchecks.io check. If R2 is not done yet, leave the cron line out of the crontab first (comment it) so the first night does not scan with untuned gates.
- **R5. First night check (owner or Claude).** `registry.job_runs` row for `wiki-paint`, `/data-status` row, `SELECT status, count(*) FROM registry.wiki_image_paint GROUP BY 1`, share of `ok`, mask total size (move masks to files + cache rule if past a few hundred MB), orphan count in the log.
- **R6. Phase B (only when the owner asks).** Steps 7-8: candidate photos, then the strip.

Do not commit unless asked.

**R2c (2026-11-07, `PAINT_ALGO` = 2).** Fresh random 100 dry run, `--order random --rps 1`, 3.9 min: 49 ok, 51 skip (two_tone 17, dark_body 14, no_car 7, dark_neutral 7, dark_paint 3, low_coverage 2, car_too_small 1). Sheets: `scripts/.data/wiki-paint/review-algo2-fresh/sheet-1..6.jpg`. Bad-tint review of the fresh sample is the owner's (PLAN.md box); two_tone share (17 %) is higher than on the tuning sample, check for wrong skips.

**R2 closed (2026-11-07).** Owner approved the fresh sample: gates are final at `PAINT_ALGO` = 2, R2d not needed. Known and accepted: mask quality is not perfect (edges, residual bad tints 004, 008, 010, 020, 058, 064, 094, 098 from the tuning sample). Left: R4-R5 (migration 0101, Cloudflare Cache Rule, cron install, first-night check) are the owner's; R3 / R6 only on request.

**Rollout check (2026-11-07, after the owner's deploy).** Live on carsua.app: `/api/wiki/recolor?brand=volkswagen&model=passat&year=2004` answers a mask (`LOOKUP_CACHE`, Cloudflare MISS then HIT), the mask `/api/wiki/paint/<md5>.webp?v=1` is `image/webp`, `immutable`, MISS then HIT; `/data-status` shows `wiki-paint` ok (first nightly run 00:30 to 01:02). Bug found: an unknown mask id answered a 500 (Fastify cannot send the JSON error body under the `@Header('Content-Type', 'image/webp')` decorator) and the `@Header` immutable cache-control was sent with it, so the edge cached the 500 for a year. Fixed in `wiki-recolor.controller.ts` (`StreamableFile` with `type`, `lookupCacheInterceptor(MASK_CACHE)`, test `wiki-recolor.controller.test.ts`); needs an API deploy and a purge of the two test URLs I requested while checking (`/api/wiki/paint/zzz.webp`, `/api/wiki/paint/000...0.webp`).

**Next session starts here (2026-11-07).** State: gates final (`PAINT_ALGO` 2), rollout live (migration 0101, Cloudflare rule, nightly `wiki-paint` cron ran ok), hero + lot carousel have the filter slides, CI test fix (`testId` on `WikiRecolorCanvas`). Open: (1) the mask 404 fix (`wiki-recolor.controller.ts`) is uncommitted / not deployed: after the deploy purge the two cached 500 test URLs in Cloudflare and `curl -I` them (PLAN.md "After the next API deploy"); (2) optional `--model` (or `--url`) option for `scripts/src/wiki-paint.ts` to scan one model locally (ВІ8800СО, VW Touareg 2005, has no mask; `--brand volkswagen --limit 60` did not reach it); (3) optional local full scan + `pg_dump --data-only -t registry.wiki_image_paint` restore on the VPS instead of 15 nights (table about 300-350 MB; never `db:seed` / TRUNCATE on the VPS); (4) the attached-photo strip (`PhotoSourcesStrip`, `SearchRoute.photoOthers`) has no filter slide; (5) R6 steps 7-8 only on request. Local test plates with a mask: DІ3047ІА, АА4609ЕІ, 26АІ9023 (Golf 2008), 03АР6564, 11ІО2017, 00002ХВ (Passat).

**Session 2026-11-07 (later).** The mask fix is deployed (commit 9f9dc88, PR #144, API deploy green). Verified with `curl -I`: the two test URLs are still cached by Cloudflare as 500 + immutable (`cf-cache-status: HIT`, Age 768), so the **purge is still needed**: `https://carsua.app/api/wiki/paint/zzz.webp`, `https://carsua.app/api/wiki/paint/00000000000000000000000000000000.webp`. With a cache-busting `?x=` the origin answers 400 and 404 without `immutable`, so the fix works. Added `--model` (repeatable, lower-cased, `wiki-paint-scope.ts` + test) for `scripts/src/wiki-paint.ts`; scripts tests 431 pass, eslint / prettier clean. No scan was run.
**Owner's order (decided):** masks are produced **locally first**, then moved to the VPS with `pg_dump --data-only -t registry.wiki_image_paint` (restore on the VPS; never `db:seed` / TRUNCATE there); the nightly cron then only handles new / `algo`-bumped photos. Update: the purge is done and verified (400 / 404, BYPASS, no `immutable`); Touareg-only scan skipped; the owner runs the full local scan in batches by count (`--limit 1500`, about 65 min each, 16 batches, resumable) in their own terminal; step C (dump / restore on the VPS, owner) comes last, after all batches. Steps 4 (attached-photo strip filter slide) and R6 only on request.

**Full scan and VPS load done (2026-11-08).** Local scan finished: 22,296 of 22,300 files (13,339 ok, 8,957 skip, 381 MB masks); the last 4 photos answer HTTP 404 upstream and are retried by every run. Step C: `docker exec carplates-v2-postgres-1 pg_dump -Fc -Z 6 --data-only -t registry.wiki_image_paint -U carplates -f //tmp/paint.dump carplates` (437 MB), `docker cp`, `scp` to `/opt/carsua/backups/`, `docker compose cp` into the VPS container, `pg_restore --data-only -t wiki_image_paint -f - | sed 's/^COPY registry.wiki_image_paint /COPY registry.paint_stage /' | psql` into a staging table (`CREATE TABLE registry.paint_stage (LIKE registry.wiki_image_paint INCLUDING DEFAULTS)`), then `INSERT ... SELECT ... ON CONFLICT (image_url) DO UPDATE ... WHERE wiki_image_paint.algo < excluded.algo` (20,801 rows inserted). VPS now 22,299 rows at algo 2 (13,342 ok, 8,957 skip); staging table and dump files dropped. Open: browser check on carsua.app, the 4 dead URLs (optional).
