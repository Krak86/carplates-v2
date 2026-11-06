# Wiki photo colour filter + extra photos

Status: **planned 2026-11-06, nothing built yet.** Prototype code and findings are in `docs/wiki-recolor/` (read "What the research showed" first).
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
5. **Web filter.** `lib/queries.ts` `wikiRecolorQuery` (online only, silent failure), `use-wiki-recolor.ts` (decides apply / skip), `WikiRecolorCanvas.tsx`, button + swatch + text in `WikiHeroImage.tsx`, store flag, i18n ua / ru / en, colour names from the existing colour labels.
   Tests: skip when close colour, no colour, disabled, mask error; component renders the button only when applicable.
6. **Docs and credits.** `docs/checklists.md` "Docs after a feature": plan-done, PLAN, features-reference section "Wiki photo colour filter", `releases.ts`, About (`FEATURES`, and the CC BY-SA "modified" note under `SOURCES`).
7. **Candidate photos.** `registry.wiki_image_candidate` (brand, model, year span, url, size, title, author, licence, bucket, lab, status, quality), scan `scripts/src/wiki-candidates.ts`
   (Commons search up to 40 results, drop interior / engine / logo / wheel titles, width at least 1000, filter by the year in the title or the generation from `model_generations`, run step 2's analysis),
   API `GET /api/wiki/photos?brand&model&year&color` (best colour match first, then others), hero uses a colour-matched candidate when one exists (no filter then).
8. **Bottom strip.** `WikiPhotoStrip.tsx` and zoom, per-photo credit, lazy below the hero (`LazySection` / `HELPER_GROUPS` checklist if it is a section), tests.
9. **Rollout.** Scan order: top few hundred models by registry count, then the rest. Job in `scripts/src/jobs.ts` + `run-ingest.sh` + `infra/vps/ingest.cron` + a `/data-status` row; Commons rate limit (`--rps`);
   set `algo` so a better algorithm rescans; watch the share of `ok` vs `skip` and review a sample gallery before turning it on for everyone.

## Risks and open questions

- Dark / neutral paint is the weak spot; the gates decide how many cars get a filter at all (my guess, unverified: about 40-50 % of photos). Everything else shows the original photo.
- The photo is a different car and often a different generation; the text must never imply otherwise.
- Licence: CC BY-SA derivatives need attribution and a "modified" mark.
- Mask storage as bytea: check the size after the first scan; move to files + a cache rule if it grows past a few hundred MB.
- `object-fit: cover` crops the photo; the canvas must use the same box, so cover it in a test.
- Unknown: how many `wiki_image` rows are `ok` (run `SELECT count(*) FROM registry.wiki_image WHERE status = 'ok'`) and how many share a file.

## Handoff

Next session: read this file and `docs/wiki-recolor/README.md`, then start at step 1. Do not commit unless asked.
