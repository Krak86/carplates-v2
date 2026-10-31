# carplates-v2 — roadmap

Rebuild of `carsua.app`. The 2019 app was a GitHub-Pages SPA reading Azure Cosmos
DB; that DB is gone, so plate search is dead (VIN still worked — it calls NHTSA
directly). This version puts the registry data in Postgres and the external-API
calls behind our own API.

## Locked decisions

| Area      | Choice                                                                                              | Note                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Repo      | single pnpm monorepo                                                                                | `apps/{web,api}`, `packages/{shared,db}`, `scripts/`                                                     |
| Runtime   | Node 24 LTS · pnpm 12.3.4                                                                           | not Node 26 (LTS only Oct 2026)                                                                          |
| Language  | TypeScript 5.9                                                                                      | **not 7.x** — `typescript-eslint` peer caps at `<6.1`                                                    |
| DB        | `postgres:18.6`                                                                                     | full-history table + materialized `current_registration` view                                            |
| ORM       | Drizzle 0.45.4 (pinned)                                                                             | **not 1.0.0-rc** — kit/zod satellites still on 0.4x. Revisit when npm `latest` is 1.x.                   |
| API       | NestJS 11 + Fastify + `nestjs-zod`                                                                  | **not 12** — `nestjs-zod` peer is 10/11. Bump when it supports 12.                                       |
| Web       | Vite 8 · React 19 · React Router 8 (declarative) · TanStack Query · Zustand · Tailwind v4 · i18next |                                                                                                          |
| Lint      | ESLint 10 flat config                                                                               | `eslint-plugin-react` dropped (calls removed `context.getFilename`); `react-hooks` covers the essentials |
| Analytics | PostHog Cloud, EU, free tier                                                                        | anonymous events only                                                                                    |
| Errors    | Sentry Cloud, free Developer tier                                                                   | official dashboard                                                                                       |
| i18n      | i18next, `localStorage` + `navigator.language`                                                      | ua/ru/en                                                                                                 |

## Version pins — why not `latest`

Everything is on `latest` **except** the six below. Each is held back for a
concrete reason with a revisit trigger — not caution for its own sake. Re-check
by re-reading this section before bumping.

| Package                   | `latest` (2026-09)                                                | We use                                         | Why held back                                                                                                                                                                                                                                                                                                                      | Revisit when                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **typescript**            | `7.0.2`                                                           | `~5.9.3`                                       | `typescript-eslint@8.70` peer-requires `typescript >=4.8.4 <6.1.0`. TS 7 (and even 6.1) breaks **all** type-aware linting (`no-floating-promises`, the parser itself).                                                                                                                                                             | `typescript-eslint` declares TS 7 support (watch its peerDeps / release notes).                                                                                         |
| **@nestjs/core** & co.    | `12.0.1`                                                          | `^11.2.3`                                      | `nestjs-zod@5.5.0` (latest, nothing newer) peer-requires `@nestjs/common ^10 \|\| ^11` and `@nestjs/swagger ^7 \|\| ^8 \|\| ^11` — no Nest 12. `nestjs-zod` is core to the design (one Zod schema → validation pipe **and** OpenAPI).                                                                                              | `nestjs-zod` ships a release listing `@nestjs/* ^12` in peerDeps. Then bump all `@nestjs/*` together.                                                                   |
| **drizzle-orm**           | `0.45.4` is the `latest` **tag**; `1.0.0-rc.4` is on the `rc` tag | `0.45.4` (exact)                               | We're on the actual latest **stable**. Not the RC: the maintainers haven't promoted v1 to `latest` (their own signal); `drizzle-kit` + `drizzle-zod` still target 0.4x; the v1 stream ran 23 betas + ≥5 RCs and still iterates. v1's headline features (RQB v2, RLS, generated columns) are irrelevant here.                       | npm `latest` points at `1.x` **and** `drizzle-kit` + `drizzle-zod` have stable v1 releases. Then follow `/docs/upgrade-v1`; our Drizzle surface is tiny.                |
| **jsdom** (`apps/web`)    | `30.1.3`                                                          | `~30.0.1`                                      | With vitest 5.0.5, jsdom 30.1.x breaks `expect(promise).rejects.toThrow('msg')` in the web project (`expected [Function] to throw error including '404' but got ''`, even for a plain `Promise.reject(new Error('404'))`; the error itself is fine). 30.0.1 passes the whole suite. Found 2026-10-15 bumping the Dependabot group. | A vitest or jsdom release fixes it — bump to `^30.1`, run `pnpm test`, check `queries.card.test.ts`. Dependabot keeps proposing 30.1.x; close or ignore until then.     |
| **node**                  | `26.8.2` (Current)                                                | `24.x` (`24.21.0` is the newest LTS "Krypton") | 26 only becomes LTS in Oct 2026; "entering LTS" ≠ ecosystem-ready — native deps and CI images take months. Conservative for an unattended VPS. Upgrading is a one-line `.nvmrc` / Dockerfile change.                                                                                                                               | 26 has been LTS for a few months and `node:26-alpine` is everywhere.                                                                                                    |
| **@tanstack/react-table** | `9.2.8`                                                           | `^8.21.3`                                      | v9 (added 2026-09, Phase 1.5 stats table) is a ground-up rewrite — feature-based internals, no top-level `useReactTable`/`getCoreRowModel`/`getSortedRowModel` (moved under `./legacy`). v8's headless sort/filter API is the one this codebase's usage is built against and is well-established.                                  | v9's docs/ecosystem (examples, Stack Overflow, this model's training data) catch up to the new API — re-verify against its actual docs before bumping, not from memory. |

**Not held back — clarifications so nobody "fixes" them:**

- **pnpm** — we _are_ on `latest` (`12.3.4`, pinned in `packageManager`). This
  machine's global launcher was broken (pnpm 10's self-management shim can't hand
  off to pnpm 12's layout, and pnpm 10 can't read a pnpm-12 lockfile); it was
  repointed at 12.3.4 directly. See `.claude/memory/pnpm-launcher-fix.md`.
- **@eslint/js** — `^10.0.1` **is** its latest. It versions independently from
  the `eslint` core package (`10.10.0`). Don't "align" it to `^10.10.0` — that
  version doesn't exist.
- **eslint-plugin-react** — `latest` is `7.37.5`; we **removed it**, not pinned
  it. 7.37.x calls `context.getFilename()`, removed in ESLint 10, so it crashes
  the linter. `eslint-plugin-react-hooks@7` (ESLint-10-native, incl. the React
  Compiler rules) covers what matters. Re-add only if a patched
  `eslint-plugin-react` ships and its extra rules are wanted.
- **tsconfig `incremental`** — deliberately unset (not a version thing): with
  per-package `tsc` its `.tsbuildinfo` lived outside `dist/`, so `rm -rf dist`
  left a stale cache and tsc silently emitted nothing.

Everything else (React 19.3, React Router 8.4, Vite 8.3, vitest 5, Tailwind 4.3, TanStack
Query 5, Zustand 5, i18next 26, `@sentry/*` 11, `posthog-js`, `drizzle-kit`
0.31, `pg` 8, `fastify` 5, `csv-parse` 7, `unzipper`, `iconv-lite`, `tsx`,
`zod` 4, `globals` 17, `eslint` 10, `typescript-eslint` 8, `vite`/`vitest`
plugins) is on `latest`.

## Phase 1 and Phase 1.5 — ✅ DONE, archived

The full write-ups (local dev stack, 2026 plate removal, registry statistics,
crash-test ratings, offline/PWA, search history, favorites, etc.) moved to
[docs/plan-done.md](docs/plan-done.md) on 2026-10-01 with their headings intact.
Read them on demand (grep the headings) — don't load the whole file.

## Phase 2 — RIA "similar cars" proxy — **not started, blocked on a token**

`GET /api/ria/similar?brand&model&kind&year` runs the whole `developers.ria.com`
sequence server-side; the `api_key` leaves the client. The ~4700 lines of
hardcoded brand→id matrices from the v1 app move server-side, ideally as a
`ria_marks` table refreshed from RIA's own `/auto/categories/{id}/marks`. Web:
lazy-loaded card list under the plate result, mounted only after the plate query resolves.
Needs a free/low-cost `developers.ria.com` API key first — see backlog below.

## Phase 3 — Platesmania — **skipped for now**

Was: a proxy endpoint injecting `PLATES_MANIA_KEY`, using `denormalizePlate`
(Cyrillic→Latin), lazy-loaded card list. **Parked**: no free API tokens are
available for platesmania.com, and scraping the site directly instead of
using an API isn't a viable substitute (ToS risk, fragile against markup
changes, no stable auth story). Revisit only if a free/affordable token
becomes available.

### Releases page (`/releases`) ✅ DONE (2026-10-15) — see `docs/plan-done.md`

### AUTO.RIA link-out for plates/VINs not in the registry ✅ DONE (2026-10-25) — link only; RIA data use is restricted, see `docs/legal-and-monetization.md`

### Wanted / stolen vehicle check ✅ DONE (2026-10-15)

Police open data (data.gov.ua) -> `registry.wanted_vehicles` + `/api/wanted` + `WantedCheck` section; write-up in `docs/plan-done.md`. Scheduled daily in `SCHEDULE.md` (VPS job still to set up).

### Wanted vehicles history, stats and `/wanted` page ✅ DONE (2026-10-17)

stolen.in.ua backfill (Aug 2020+), card history, `GET /api/wanted/stats`, `/wanted` page, home teaser; write-up in `docs/plan-done.md`, steps in `WANTED_PLAN.md`.

### Plate image recognition (camera/upload) ✅ DONE (2026-09-22) — archived

Write-up moved to `docs/plan-done.md` ("Plate image recognition … Plate Recognizer cloud"). On-premise SDK ruled out (same per-lookup licensing).

**Mobile follow-ups (2026-10-01; shipped work in `docs/plan-done.md`, "Mobile UX pass").** A web
page only gets the one stream the browser exposes, so far-away plates on phones are limited by that
lens/sensor. Open ideas, in order: (1) lens switch labelled 1×/3×/5× once we know which cameras Chrome
lists on the S24; (2) native wrapper (Capacitor/CameraX) only if long-distance live AR becomes core.
Not worth doing: extra software zoom beyond the hardware cap (no gain for OCR), and `takePhoto()`
stills for AR (field of view/aspect differ from the preview, so detector boxes don't map onto them).

### Own ALPR model + AR overlay — planned (2026-09-27), step 1 shipped

User-requested pair, scoped together because the second depends on the
first: **AR overlay** (live camera feed, plates read continuously, specs/
ratings drawn over the video) and **own-model plate recognition** (self-
hosted, no token, no per-lookup cost — vs. the metered Plate Recognizer cloud
API above). Written verbosely on purpose — each step below is meant to be
picked up cold in a **new session**, without re-deriving this research.

**Why one depends on the other.** The camera/photo flow above (Plate
Recognizer cloud) is metered (`PLATE_RECOGNIZER_MONTHLY_BUDGET`, ~15s per
call) — fine for "snap one photo, get one plate," structurally unworkable for
an AR loop that needs to read plates continuously from live video at no
per-call cost. Own-model recognition is a **prerequisite** for AR overlay,
not a parallel feature, hence the step order below.

**Chosen approach.**

- Recognition: **hybrid**. A lightweight detector runs client-side (in the
  browser) every frame, just to draw a live tracking box. Once the box is
  stable, only the small cropped plate region — not the full video — is sent
  to a self-hosted OCR service. Rejected: streaming full video to a server
  (bandwidth, no benefit) and pure on-device OCR (heavier browser model;
  revisit in step 2 if the client/server split proves annoying in practice).
- AR: **web-based pseudo-AR** — a `<canvas>` overlay positioned over the
  existing `<video>` element (`CameraCaptureDialog.tsx`), driven by a
  `requestAnimationFrame`/Web Worker loop drawing a bounding box + a spec
  card. Not a native app (nothing else in this stack has a native surface)
  and not WebXR (a plate is a flat 2D marker in the frame, not a 3D-anchored
  object — no depth/pose tracking needed).

**Models, step 1 and the tiled-detection / photo-viewer work are done** — moved to `docs/plan-done.md`
("Own ALPR model — models, step 1 …"). Open work continues below ("Real-photo pass", hard-image TODO, steps 2-4).

**Real-photo pass (2026-09-30 / 10-01, 88 own Ukrainian photos) ✅** — EXIF orientation, truncated reads, candidate filter, stacked/motorcycle plates, legacy-shape junk: findings in `docs/plan-done.md` ("Own ALPR real-photo pass"). `eval/labels.csv` was added later (2026-10-26, 3 plates).

**Moped plates, constrained decoding, alternative reads (2026-10-26) ✅** — row-wise reader for three-row moped plates, slot-class decoding with the registry's real letter set, one-character alternatives returned per plate and shown as numbered/colored chip groups; also a latency regression found and fixed (worst photo 98 s -> 1.3 s): `docs/plan-done.md` ("Own ALPR: moped plates, constrained decoding, alternative reads").

**Own ALPR — open actions (as of 2026-10-26, continue here):**

- ⏳ **Ground truth for the eval — partly done.** `services/alpr/eval/labels.csv` (gitignored) has 3 plates, recall 3/3 (`forte_ft__645663814hd.webp` `AB1918AB`, `imz-ural_m-67-36__605381145hd.webp` `AH4018AC`, `ua_ai1920ja.jpg` `AI1920JA`). **Still to do:** the photos for `BX5213BO` (white-rack Mercedes 1940) and `BC3064XC` (red truck) are not in `eval/images/` (not found; copy them in and add the rows), and the other 85 photos are unlabelled, so recall is still measured on 3 files only. The `ALT_CONFIDENT_*` and `ALT_MIN_SCORE` values stay untuned until more are labelled.
- ✅ **Web upload resize (2026-10-26).** `shrinkImage` cap 3200 -> 4608 px: the 3200 cap cost 4 confident reads on 4000 px phone photos (incl. `BC9779IX`); `eval.mjs --shrink` mirrors it. Details: `docs/plan-done.md` ("Web upload resize").
- ✅ **Alternatives noise (2026-10-26).** A primary >= 0.97 now suppresses alternatives more than 0.03 behind it (`ALT_CONFIDENT_SCORE` / `ALT_CONFIDENT_GAP`); near-ties stay. 6 of the alternatives on 90 photos dropped, none added, `ALT_MIN_SCORE` 0.55 unchanged: `docs/plan-done.md` ("Alternatives noise"). Re-tune once more photos are labelled.
- ✅ **Registry check of alternatives (2026-10-26).** `RegistryRankService` (`apps/api/src/recognize/registry-rank*.ts`): when a plate's best read is not in `registry.registrations` but an alternative is, the alternative takes its place (scores swapped inside the box group). No contract change, so no visible "exists" flag; add one only if wanted (it means editing `schemas.ts`, which resets offline data). Not yet exercised end to end against the real registry.
- ✅ **Concurrency (2026-10-26).** `/recognize` and `/recognize/vin` are plain `def` (FastAPI threadpool): 3 simultaneous uploads of the slowest photo finish in ~6.3 s wall instead of 3/6/9.4 s serial, reads identical. Uploads still compete for the same CPU (no 3x); more workers only if that becomes a real problem. Detail: `docs/plan-done.md` ("Concurrency").
- ⏳ **UI polish still to check:** light theme and desktop, the zoom dialog (`PhotoZoomDialog`) with groups, a11y of the chain/number badges, and the moped
  and truck photos end to end in the browser (only the car and the parking photos were checked). Not started; also confirm the new 4608 px shrink and the registry re-rank in the real app (the re-rank has only unit tests, not run against the registry).
- ✅ **Letter set (2026-10-26).** Re-measured on the full registry (24.7M rows): same 18 letters (12 Cyrillic + Y J F D G Z, 60k-389k each); L/U/N/S/R/V/Q are 0.5k-10.5k. Kept as is in `app.py` only. Known gap: TS side (`isUaPlate`) accepts any Latin letter and `repairOcrPlate` maps `5`->`S` (rare letter); the own ALPR never sends it. Sharing the set needs a file copied into the ALPR build context; not done.
- ❓ **Cloud route.** `/api/recognize/plate/cloud` + `PLATE_RECOGNIZER_*` env still exist (off unless flag + token; the web app never calls it). Decision
  pending: delete it entirely (also `deploy-api.yml`, deploy.md) or keep as a manual cross-check.
- ❓ **Unexplained label.** A screenshot showed `AA4018AC` for the `AH4018AC` moped; the local service never returned it (it returned `AH4078AC`). Source unknown
  (older build or another tool), nothing to fix unless it reappears.

- **Idea, not built:** use the photo date to show who held the plate _on that
  date_ (the registry keeps full history), and flag a read that only matches an
  older owner as a likely misread.

**Improving the model on hard images — TODO (eval set partly done).** The stock
`yolo-v9-t-384` detector + `cct-xs-v2-global` OCR miss plates a human reads
fine: rain, night/dark, motion blur, dirt/mud, steep angles, tiny plates.
Plan, in order — stop as soon as recall is good enough:

1. **Build an eval set first — photos collected (88), labels still missing;
   `eval.mjs` exists, `labels.csv` and the false-positive count don't.** Collect ~100-300 real Ukrainian photos (incl.
   the hard cases above) into a gitignored `services/alpr/eval/` with a
   `labels.csv` (file → plates in the photo, since the count of plates is the
   issue, not just the text). Add `services/alpr/eval.py` that runs the
   `/recognize` logic over it and reports plate recall (found/labelled),
   exact-match OCR accuracy and false positives per image. Every change below
   must beat this baseline — no tuning by eyeballing single photos.
2. **Cheap inference-side wins (no training):** detector confidence
   threshold (`alpr.detector` default may be too strict — sweep it against
   the eval set), tile size/overlap in `app.py`, test-time augmentation for
   dark photos (CLAHE/gamma on the crop, retry OCR on the brighter copy,
   keep the higher score), deblur/sharpen retry for low-score reads, and a
   second OCR pass on a 2× upscaled crop. Plus accept the result only if
   `repairOcrPlate` yields a valid Ukrainian format, which filters false
   detections.
3. **Fine-tune the OCR** (`fast-plate-ocr` supports custom training; its
   docs describe the dataset format + config): label ~1-3k cropped Ukrainian
   plates (export crops from the detector over our photos, correct the text
   by hand — Ukrainian plates are a closed alphabet of 12 letters + digits,
   which makes a small custom head realistic). Start from the global model's
   weights, train with heavy augmentation (blur, noise, brightness, rain
   streaks, perspective), export ONNX, swap in `app.py`, re-run the eval.
4. **Fine-tune the detector** only if step 2-3 leave missed _detections_
   (check per-image whether the box was absent vs. the text wrong): train a
   YOLOv9-t on labelled boxes (`open-image-models` documents its training
   recipe; licensing stays MIT as long as nothing Ultralytics is pulled in —
   re-verify before adopting any other trainer). Needs several hundred
   boxed photos; annotate with CVAT/Label Studio.
5. **Feed it from real use.** Optional opt-in "this read was wrong — send
   the photo" button (needs a privacy/retention decision — plates are
   personal data; see Phase 5 accounts) to grow the dataset over time.

Data sourcing caveat: only use photos you own or have rights to; public
Ukrainian plate datasets are scarce, so expect to label your own.

**Step 2 — client-side live detection box, no OCR yet. Not started.** Run
just the detector (`yolo-v9-t-384-license-plate-end2end`) in-browser via
`onnxruntime-web` (WASM, falling back from WebGPU where unsupported — iOS
Safari's WebGPU support is inconsistent as of this writing), drawing a
tracking rectangle over the live `<video>`. Decide when starting this step
whether `CameraCaptureDialog.tsx` is the right host for this or a new
full-screen AR route is cleaner. Getting the ONNX file into the browser:
inspect `/root/.cache/open-image-models/` inside the built `services/alpr`
image (or re-read `open-image-models`' source) for the exact Hugging Face
Hub URL/filename it downloads server-side, and fetch that same file
client-side rather than re-deriving/re-exporting it. Pure rendering/perf
work, **no backend changes**. Running detection on a Web Worker +
`OffscreenCanvas` (not the main thread) is a hard requirement, not a
nice-to-have — React 19's render loop shares the main thread and a
per-frame detector would jank it otherwise.

**Step 3 — wire live detection → stabilization → crop → OCR → overlay. Not
started.** Once step 2's box is stable for N consecutive frames, crop that
region from the video frame and POST it to step 1's
`/api/recognize/plate/local` (a small crop, not a full frame). Run the
result through the **already-existing, unchanged** `normalizePlate`/
`repairOcrPlate` → `/api/plate/:plate` (+ `/api/safety`) chain, and render a
spec card (brand logo, vehicle-kind icon, safety star rating — all already
built, see Phase 1.5 above) anchored near the tracked box. Debounce so a
stable, already-answered plate isn't re-queried every frame.

**Step 4 — polish. Not started.** Multi-plate tracking (more than one car in
frame at once), graceful fallback to the existing single-shot capture flow
on unsupported/slow devices, telemetry on detection/OCR hit rate.

### VIN image recognition (camera/upload) — researched 2026-10-03; first slice built 2026-10-05

**Status:** two slices shipped 2026-10-05 (button, barcode + OCR path, ranking; then outlines + "Also found" chips,
stamped-VIN reads, junk rejection, WMI look-alike correction, offline VIN-prefix fallback on the decode page) —
write-up in `docs/plan-done.md` "VIN photo search". Still open below: eval set (step 1 — every OCR tweak so far was
judged on ~10 ad-hoc photos), multi-frame voting (step 4), LLM fallback (step 5), a second recognizer pass on the
cropped VIN band (a Jincheng engine plate with wide-spaced dotted characters still reads only 14 of 17 chars; plain
contrast/upscale passes made it worse, width-squeezing helped other stamped VINs), look-alike variants beyond the
3-char prefix (a misread later in the VIN is not caught), and a partial-VIN (<17) hint.

**Decision: share the capture UI, not the model.** `fast-alpr` (plate detector +
`fast-plate-ocr`) is trained on short plate crops — it can't find or emit a 17-char
VIN. A VIN is a different task (text line on a windshield sticker / door-jamb label /
stamped metal), so it gets its own recognizer. Shared: the camera/upload dialog,
`use-plate-recognition.ts` (rename to something generic when starting), the
`/api/recognize/*` route shape, and "navigate to the result". No published accuracy
benchmarks exist for VIN readers (Anyline/Dynamsoft/Vincario publish none); only
data point found: Mindee docTR fine-tuned on 5,000 VIN photos → 80% recognizer-only /
90% end-to-end exact match, generic OCR clearly worse. We have no such dataset.

**Plan, in order:**

1. **Eval set first.** Copy the `services/alpr/eval/` pattern: 30–50 own VIN photos
   (windshield, door jamb, glare, angles) + labelled VINs, scored by exact match.
   Every choice below is decided against it, not vendor claims.
2. **Barcode path, on-device, free.** Door-jamb VINs are often Code 128 / Code 39 /
   Data Matrix: browser `BarcodeDetector` (or zxing-wasm fallback) — exact, no OCR
   errors, no backend call. Mostly US-style labels.
3. **OCR path for windshield text.** `POST /recognize/vin` in `services/alpr/`
   (same Docker image, CPU/ONNX): general text detector + recognizer (PaddleOCR or
   RapidOCR). Post-process: regex `^[A-HJ-NPR-Z0-9]{17}$` (no I/O/Q), remap
   `O→0`, `I→1`, `Q→0`, pick the best 17-char window across detected lines.
   Check digit (pos. 9) is a **soft** signal only — mandatory in North America,
   legitimately fails on many EU/UA-market VINs. A successful NHTSA decode is the
   stronger confirmation. Put VIN normalization/validation in `packages/shared`
   (single source of truth, like `normalizePlate`).
4. **Multi-frame voting** in live camera mode — agreeing reads across frames add more
   accuracy than any model swap. Reuses the AR steps' stabilization above.
5. **Optional fallback: multimodal LLM** (Claude vision) for photos OCR rejects. Low
   volume so cost is small, but adds latency, a privacy question (VIN leaves our
   infra) and hallucination risk — only accept output that passes the validation in
   step 3. Compare against step 3 on the eval set before enabling.

**Skipped:** paid VIN SDKs (Anyline from ~€457, Dynamsoft from ~$1,249 — no published
accuracy, and plate OCR is deliberately self-hosted/no per-lookup cost); stamped
chassis model (low-contrast embossed metal — plain stamped door-sill VINs now read via the squeeze retry, see
plan-done.md; only dotted/very wide-spaced ones still fail); fine-tuning
a VIN model until there are thousands of labelled photos.

### Phase 3+ — recalls — **researched, parked (2026-09-24)** — _revisited 2026-10-07: RDW (EU) recall data is CC0, see "Open-data round 2"_

Crash-test _ratings_ (`api.nhtsa.gov/SafetyRatings`) graduated out of this
section and shipped for real — see Phase 1.5 above ("Crash-test safety
ratings (NHTSA), reversing the earlier 'parked' call") for what changed and
why the original pessimism below turned out to be too broad-brush (it holds
for grey-import/Euro-only-spec vehicles, but not for the many
globally-sold-platform nameplates actually common in Ukraine's fleet).

**Recalls** (`api.nhtsa.gov/recalls/recallsByVehicle?make=&model=&modelYear=`,
same free provider, separate from SafetyRatings) still has the same
make/model/year key and the same US-market caveat — a recall campaign may not
apply to a non-US-spec unit sharing the model name, and unlike a star rating
(where a shared global platform genuinely shares its crashworthiness), a
recall is about a specific parts/build defect that may simply not exist on a
non-US production run. Per-recall fields: `Component`, `Summary`,
`Consequence`, `Remedy`, `NHTSACampaignNumber`, `ReportReceivedDate`,
`parkIt`/`parkOutSide`/`overTheAirUpdate` flags. **Decision: still skip** —
the mismatch risk here is sharper than it was for ratings, since a recall
presented as applicable when it isn't is actively misleading (not just
"missing data"), not merely low-value. Revisit only alongside a real accuracy
story for matching recalls to non-US-spec vehicles, not just a shared model
name.

## Backlog (2026-09-22)

Snapshot of what's actually next, split from what still needs a decision
before it's buildable. Not a phase — items here get folded into Phases 2-5
above once scoped, or dropped if research says no.

- [ ] **Garpun wanted plates + SETAM auctions (2026-10-31; Garpun steps 1-3 + auctions steps 4-5 (DB, parser, schedule) done, step 6 + per-lot SETAM link + `/auctions` page (step 7a) done; Garpun tab on `/wanted` + auction cards + catalog make line done 2026-10-31; open: steps 9, 11, 12 (read article, SETAM enrichment, optional), live Cloudflare rule edit for `/api/auctions/stats`, 10d/10e done 2026-10-31)** — two new data.gov.ua feeds: wanted plates joined into the `/wanted` card section with a Garpun chip, and car lots from SETAM auctions as a card section + `/auctions` route + stats. Steps: `docs/garpun-auctions-plan.md`.

### Actual — ready or in progress

- ✅ History, favorites, camera/photo search, registry stats (table + map), brand breakdown, kind icon + logo — done, see Phase 1.5 / "Plate image recognition" in `docs/plan-done.md`.
- ⏳ **Speed round: advanced search + photo recognition on 4G** (researched 2026-10-29; nothing measured yet, estimates from code). Indexes are already
  complete (0012–0015, 0042, 0059), so the cost is the query shape: every page/sort click re-fetches up to 10k wide rows (`SEARCH_COUNT_CAP`) and sorts in Node.
  (1) ✅ result cache + `Intl.Collator` sort in `search.service.ts` (write-up in `docs/plan-done.md` "Search result cache");
  (2) ❌ tried 2026-10-29 and **removed**: uploading only on-device plate crops (detector as in AR) was 5-10x faster on emulated 4G (1.2-5.6 s vs 10-29 s) but lost confident reads on 10 of 90 eval photos
  (15 reads; small background plates the detector does not box) - not acceptable, no plate may be lost. Write-up and numbers: `docs/plan-done.md` "Photo search: on-device plate crops". Instead: ✅ photo search always uploads the whole photo and shows an
  "Uploading and recognizing..." status line, which turns into a slow-connection hint after 8 s (`PhotoThumbnail.tsx`, `photo.recognizing` / `photo.slowHint`).
  (d) ✅ cache was storing a lazy Drizzle query (re-ran on every await), fixed with `Promise.resolve`; now 2.3 s first call, 0.2 s for page 2 / re-sort (write-up in "Photo search: on-device plate crops" > Measured).
  (e) ❌ lower upload size: 2560 loses 7 confident reads, 4608 loses 1, so `MAX_DIMENSION` stays 4608 (`docs/plan-done.md` "Photo search: upload shrink size"). (f) ✅ `shrinkImage` runs in a worker (`image.worker.ts`); navigating on the plate string needs nothing (one JSON response). (g) ✅ `EXPLAIN` on brand+model: 2-char models defeat the trigram index; spellings now resolved from `stats_by_*` and served by the btree, 2.3 s -> 0.37 s, no migration (`docs/plan-done.md` "Advanced search: brand + model via the rollups").
  **Left in the speed round (all optional, do when it hurts):**
  (h) 📋 composite btree `(brand, model, make_year)` (new `packages/db/migrations/NNNN_*.sql`, backward compatible, `CREATE INDEX CONCURRENTLY`-style build): brand+model+year/colour still takes ~1.1 s (lossy bitmap heap scan, 1M rechecked rows, `docs/plan-done.md` "Advanced search: brand + model via the rollups"). Cost: long build and several hundred MB on the 8.8 GB `current_registration` (16.7M rows). Measure disk and the plan with the index first; only if brand+model+year is a common combination.
  (i) 📋 `EXPLAIN (ANALYZE, BUFFERS)` on the other combinations, not measured yet: brand alone, model alone (the `= ANY` route needs both), region, fuel, body, oper, `purpose` (unindexed). Needs one slow filter from the owner; same recipe: resolve the spellings from `stats_by_*` when a substring filter is the cost.
  (j) 📋 the per-instance match cache is cold after every deploy/restart (first call per filter set pays the full query); a warm-up of the top brand+model pairs is possible but not needed yet.
- ⏳ Own ALPR model + AR overlay — step 1 (self-hosted OCR service,
  preferred over the metered cloud API above) done 2026-09-27; steps 2-4
  (client-side live detection, AR overlay, polish) not started — see
  "Own ALPR model + AR overlay" under Phase 3 for the full plan and exact
  resume point. Accuracy work since (EXIF rotation, padded OCR, tile-seam fix,
  registry-verified plate shapes, photo EXIF info, stacked two-row plates,
  sharpened OCR retry for small motorcycle plates, legacy-shape score floor) —
  see its "Real-photo pass";
  next: `labels.csv` for the 88 photos, then two-row plate support.
- ⏳ RIA "similar cars" proxy (free token) — Phase 2, blocked on getting a
  `developers.ria.com` API key; otherwise unchanged from that section's design.
- ⛔ Platesmania — **skipped**, see Phase 3: no free token, scraping ruled out.
- ✅ **Size & parking section + size-class chip** — done 2026-10-14 (`?section=size&tab=schema|parking|garage|norms`; RDW +
  Wikipedia + VIN merged, gaps forecast, scaled side/top drawing, ДБН / German / US bays, ПДР limits) — see
  `docs/plan-done.md`. Open: ⏳ ДБН Додаток Є class table (only the clause 5.2 / 4.6 figures are verified).
- ✅ **Realistic vehicle drawings** — done 2026-10-29 (side/top silhouettes with arches, towing diagram, 6 new kind icons; original art, About note). Write-up: `docs/plan-done.md`.
  ✅ Follow-up 2026-10-29: side outlines traced from real side-on photos (`SIDE_PATHS`; source photos not recorded - redraw from catalogue dimensions if a licence question comes up), pickup examples with dimensions. Write-up: `docs/plan-done.md` "Advanced search legend and icons, news page, page width, traced silhouettes".
- ✅ **Advanced search legend + icons, news page colours/skeletons, one page width (`max-w-6xl`)** — done 2026-10-29, see `docs/plan-done.md`.
- ✅ **Share links `/go/<alias>` + `/share` page** (2026-10-30; per-alias previews, client redirect to home with the entry pulsing). Write-up: `docs/plan-done.md` "Share links"; conventions `docs/features-reference.md` "Share links".
- ✅ **Catalog MVP `/cars/:make/:model`** (2026-10-30; top 300 models indexable, 1,697 pages, sitemap index + `sitemap-cars.xml`, injected `#root` block, `db:refresh-catalog`). Live 2026-10-30 (first build on the VPS, Cloudflare rules, prod browser check done). Blocks 1-3 and 5 of `docs/catalog-plan.md` "Next: make the pages usable" are deployed and checked on prod 2026-10-30 (plate/VIN/`/stats` links, `/cars` + `/cars/:make` hubs, breadcrumbs, year/generation/fuel/body chips with generation stats, `Car` JSON-LD, engine line, sitemap 1,029 URLs read by Search Console). Bing is submitted (imported from Search Console), 29 display-name overrides are live, the catalog job timeout is 60 min. Open: check Search Console "Pages", Bing and the `/cars/*` cache hit ratio about 2 weeks after 2026-10-30, then **year pages** (block 4) only when the first 300 pages are indexed. Full done / left list: `docs/catalog-plan.md` "Done and left". Write-up: `docs/plan-done.md` "Model catalog MVP"; conventions `docs/features-reference.md` "Model catalog".
- ✅ **Discovery/SEO groundwork** — done 2026-10-30: robots/sitemap purge on deploy, per-page share cards `/og/page/<slug>.png`, IndexNow, catalog Step 1 fold check (catalog MVP is next, see `docs/discovery-plan.md` "Next"). Write-up: `docs/plan-done.md`.
- ✅ **Size drawing blueprint + front view, VIN EU fallback / Asia history links, section share text** — done 2026-10-30. Write-up: `docs/plan-done.md` "Size drawing, VIN fallbacks…"; conventions `docs/features-reference.md` "Blueprint style".
- ✅ **Chip "?" explainers, `?weight=` tab URLs, mobile polish (pinch zoom, photo swipe), "VIN data starts in 2021" note** — done 2026-10-14, see `docs/plan-done.md`.
- ✅ **VIN decode overview + plate-card split** — done 2026-10-02 (tabs, VIN anatomy, equipment map, engine/origin
  cards, grouped details; plate card now has separate _Registration history_ and _VIN decode_ sections) — see
  `docs/plan-done.md`. Open follow-ups:
  - ⏳ VIN page: headline the current plate (`registry.plate` / `registry.plateInferred`, already returned by
    `/api/vin/:vin`, still unused there); retitle the registry timeline to match `result.historyTitle`.
  - ⏳ Translate the Raw-tab / detail-row labels (NHTSA variable names) and common values into ua/ru — deferred until
    the new view had been judged.
  - ⏳ Polish: hide the GVWR class scale for motorcycles (meaningless there); drop the near-duplicate Vehicle Type /
    Body Class chips; Windows renders flag emoji as letters (consider SVG flags); compute the VIN check digit locally
    for non-NHTSA-covered markets.

- ✅ **Side widgets — Bluesky posts + share price** (2026-10-06, `037f7a7` / `7b225cb` / `c8d9950`) — built, see `docs/plan-done.md` ("Side widgets"). **Open:** (a) the share price rides Yahoo's
  _unofficial_ chart endpoint (no key, no SLA, terms unclear) — fine for a side widget, but cache longer / drop it if it ever rate-limits or breaks, and don't build anything on it; (b) `stockCompanies.ts` covers 32 tickers —
  brands without a listed parent (or private groups) simply show nothing; (c) Bluesky shows whatever the keyword search returns (no relevance/spam filter beyond the opt-out label) — judge on real plates; (d) browser-check at
  ≥ 1400 px with the left sidebar open (overlap) and on the VIN / photo-result routes.
- ✅ **Stock news widget + Social chip, mobile sidebar buttons, viewport-safe info popups, `/install` page, `pnpm tunnel`** (2026-10-13, `ffceeff` … `55a1fcb`) — built, see `docs/plan-done.md` ("Stock news, mobile sidebar…"). **Open:** news rides the same unofficial Yahoo endpoints as the share price (drop the widget if they break).
- ✅ **Skeleton placeholders** for stats pages and homepage stats (2026-10-06, `de0a53c`) and the **About page sources + icons** (`9b974fd`) — built, see `docs/plan-done.md`.
- ✅ **Weight rankings, Stack Exchange + Lemmy community posts, richer "Copy all info" export, WebP brand logos** (2026-10-09, `3f7a596` … `bb9f055`) — built, see `docs/plan-done.md` and `docs/features-reference.md`. **Open:** Stack Exchange / Lemmy are unauthenticated public APIs (rate limits unmeasured — judge on real traffic, drop the widget column if they throttle); weight edges for models with few vehicles are percentile-based, so tiny samples are noisy (per-group floor only); Lighthouse/LCP not yet measured after the perf pass (Phase 4).
- 📋 **Feature guide** (`/features`-style tour with Playwright screenshots, ua/ru/en) — planned 2026-10-06, not started: [FEATURES_PLAN.md](FEATURES_PLAN.md). The "What's new" part shipped as the `/releases` page (2026-10-15, no bell). **Conflicts with the
  paid-features route** — see Phase 5 "Stage A".

- ✅ **Wanted (stolen) vehicles** — built 2026-10-15 (`5bed8de`), see above and `docs/plan-done.md` (original design archived there).
- ✅ **Vehicle origin** (flags chip, `?section=origin` timeline, model plants, `/stats` "Where cars come from"; 2026-10-25/26) — built, see `docs/plan-done.md`, `docs/features-reference.md` and [ORIGIN_PLAN.md](ORIGIN_PLAN.md) (open follow-ups listed there).
- ✅ **Cross-links between result-card sections, About features list** (2026-10-15, `6df9280`, `c1951da`) — see `docs/plan-done.md`.
- ✅ **Pre-public secrets audit, production DB-credential guard, first Dependabot round** (2026-10-15) — see `docs/plan-done.md`. **Open:** run
  gitleaks over the full history before flipping the repo public; `@tanstack/react-table` 9 migration (v8 held).

- 📋 **Window sticker** (Monroney-style spec label, PDF/print) — idea 2026-10-13, researched, not started.
  - **Templates:** no free official one to reuse. The US Monroney label is mandated by the Automobile Information
    Disclosure Act (1958) and the EPA fuel-economy label by 40 CFR 600 — specs only, no licensed artwork; the EU has
    the CO₂/fuel label (Directive 1999/94/EC) at the point of sale; Ukraine mandates nothing. So we design our own
    A4/Letter layout (not an "official" label — say so in a footer) and render it with the existing `export-pdf.ts`
    pipeline (lazy, online-only chunk) as a new `ExportFormat`, or a print-styled `/sticker` view.
  - **What we can fill (already in the app):** brand/model/year/generation + hero image & logo, body, colour, fuel,
    engine capacity/power, weight, region and registration history (registry); NHTSA VIN decode (trim, engine,
    transmission, drive, GVWR, plant, safety equipment); RDW specs (EU); VehiclesDB chips; CO₂ score + EPA/EEA fuel
    economy; NHTSA / Euro NCAP / JNCAP ratings; recalls + MOT; value estimate; QR code to the result page.
  - **What we cannot:** original MSRP, option packages and prices (the real Monroney comes from the manufacturer per
    VIN, not NHTSA's free decode) — so it is a "spec label", not a reproduction; no data → omit the block.
  - **Next:** reuse the `ExportReport` sections from `export-report.ts` (single data gatherer) and add a layout that
    maps them to fixed label blocks; decide Letter vs A4 and the three languages.

- 📋 **Link-preview follow-ups** (2026-10-01): (a) e-Ukraine typeface (thedigital.gov.ua/fonts, Dropbox
  download) for the OG cards — blocked on confirming its license (page only says CC BY 4.0 for "content") and
  glyph coverage (ї є ґ) + TTF/OTF files; the site itself stays on the system font stack; (b) test a real
  unfurl through ngrok/prod (Telegram, Facebook debugger) once deployed.

- ✅ **Fuel economy & emissions (CO2 score + icon)** — built 2026-10-02 (EPA + EEA, result-card badge, /fuel stats page); tuning left.
  See "Fuel economy & emissions" below.

- ✅ **Year-aware hero image** (2026-10-02) — Wikimedia Commons search by brand/model/year, per-kind placeholder when
  no photo. Open: pick the default via `WIKI_IMAGE_SOURCE` after A/B comparing `?source=commons|wiki` on real plates.

- ✅ **Background layers** (2026-10-04) — built, see `docs/plan-done.md`. Open: (a) Lviv publishes free GTFS-Realtime vehicle positions
  (`track.ua-gis.com/gtfs/lviv/vehicle_position`, ~11 s; licence unchecked) — an API proxy + lazy Leaflet map would give real moving public
  transport for Львів only; (b) YouTube ISS streams can be retired or embed-blocked — swap ids in `LIVE_STREAMS` (earth / traffic / city, `apps/web/src/lib/live-background.ts`; traffic/city streams added 2026-10-05).

### Visual stats, map logos, cards and quizzes — planned 2026-10-29, steps 1-5 built

**Resume here:** steps 1-3 are built, browser-checked and committed (`bb4f87e`, `45723e8`; write-ups in `docs/plan-done.md` "Overlap fix for step 2" and "Map modes, step 3"; convention `docs/features-reference.md` "Map modes"). Step 4 (plate card PNG) is committed (`daf02cf`, `d3e822f`) and browser-checked 2026-10-29 (card with badge, long model title).
Next: (a) browser-check step 4 (`lib/plate-card.ts`, write-up in plan-done "Plate card PNG"; try a plate with and without a ranking badge, dark/light, phone share sheet); (b) the link-preview `/og/<PLATE>.png` stays the API-rendered card, but now has the region flag (top-right) and `carsua.app` (done 2026-10-29, see plan-done "OG card flag"); (c) step 5 (quiz). `releases.ts` + About lines for map markers, modes and plate card done 2026-10-29 (steps 1-4 deployed to stage). Small follow-ups: model mode shows the logo only (name is in the tooltip); the `/stats` map is online-only.
Setup on a fresh DB: `pnpm install`, `pnpm db:migrate`, `pnpm db:refresh-region-brand-stats` (162 rows, 27 regions), `pnpm db:refresh-region-facet-stats` (434 rows, 27 regions), `pnpm --filter @carplates/shared build` and `pnpm --filter @carplates/db build` (both consumed from `dist/`), then `pnpm dev` (web on the first free port from 5173, API on 3000). Check at `/stats?view=map&logos=1&mode=brand|model|fuel|origin|ev`.

Idea round: put the registry stats on the map and in diagrams, and add small canvas/HTML interactions on top of what already exists
(`StatsMap`, `BrandLogo`, region flags, racer, `renderChartPng`). Routes touched: `/stats` + `/wanted` (shared `StatsMap`), `/` + `/:query`
(card), a new `/play`-style route (quiz; needs `ROUTE_TITLE_KEYS`, `STATIC_PAGES`, sidebar, About, releases).

1. ✅ **Per-region brand rollup + API** (2026-10-29) - `registry.stats_region_brand` (migration 0079; top 5 brands per plate region, folded by
   logo slug, plus the region's fleet), `scripts/src/region-brand-stats.ts` (`db:refresh-region-brand-stats`, in `db:refresh-derived`),
   `GET /api/stats/region-brands`, `regionBrandStatsQuery`. Covered by the existing edge-cache rule (`/api/stats/*`).
2. ✅ **Brand-logo layer on `StatsMap`** (2026-10-29) - `logos` prop, `/stats?view=map&logos=1` checkbox; the biggest brand's logo on a white
   chip at each polygon centroid, sized by the region's fleet share; tooltip lists the top 3 brands. `/wanted` does not pass `logos`.
   Browser-checked 2026-10-29 (dark + light, phone width); overlaps fixed by `spreadLogos` (chips pushed apart, leader line to the centroid). Open: `releases.ts` entry once deployed.
3. ✅ **Map modes** (2026-10-29) - `?logos=1&mode=brand|model|fuel|origin|ev` select on `/stats`; `registry.stats_region_facet` (migration 0080), `region-facet-stats.ts`, `GET /api/stats/region-facets`, `regionFacetStatsQuery`. EV share = electric fleet share from the fuel rows. Open: `releases.ts` / About once deployed.
4. ✅ **Shareable plate card PNG** (2026-10-29, built and browser-checked) - canvas card (plate, brand logo, region flag, year, one fact) through the `renderChartPng` pipeline; button
   on the result card; link previews stay API-side (`apps/api/src/spa/`).
5. ✅ **Games hub `/play` + quizzes** (built 2026-10-29, write-up plan-done "Games hub /play"; region and higher-lower browser-checked, logo quiz / end screen / phone not yet) (decided 2026-10-29: own route `/play`) - a hub listing every game (quizzes, the racer `/race` and `/relax`, later ones) as cards, plus the quiz itself:
   "guess the region from the plate" on `StatsMap`, then logo quiz and higher/lower from `stats/top`. Streak and best score in localStorage first, accounts later.
   Cross links both ways: `/stats` map, `/read/plates`, the result-card region line and the racer banner link to `/play`; the quiz end screen links to `/stats`, `/read/plates`, `/race`
   and a plate lookup; a score can be shared as a picture (`renderPlateCardPng` / `renderChartPng`). New public route checklist: CLAUDE.md (`ROUTE_TITLE_KEYS`, `STATIC_PAGES` ua/ru/en, sidebar, About, releases).
6. ⏳ **Diagrams on `/stats`** - treemap (brand -> model), heatmap (region x fuel / body), year histogram, import-wave line (`/read/imports`),
   stolen-by-year vs. registered share (`/wanted`); hand-rolled SVG + `d3-scale`/`d3-shape`, each a `LazySection`, each with an export `chart` builder.
7. ⏳ **Later** - Sankey (origin -> brand -> fuel), bar-chart race by registration year, collectible region cards, racer "drive Ukraine" route.

### Test-drive racer game ("Free test drive" banner) — ✅ built (2026-10-08), follow-ups left

Built: a desktop-only promo banner beside the result card (xl+; a 🎮 circle on lg; eases in 3 s after the card shows) opens a pseudo-3D racer in a modal. Write-up, file map and gotchas: `docs/plan-done.md` "Test-drive racer game".

- ✅ (2026-10-09) Standalone **`/race`** route (no plate; random famous car + hardcoded presets per body type in `lib/racer/presets.ts`; HUD km odometer for the session) — see `docs/features-reference.md` "Test-drive racer".
- ✅ (2026-10-28) **Mini-map** of the generated road (rotating top-down radar, curves/trees/traffic from the engine) — `docs/features-reference.md` "Test-drive racer". [ ] Ideas left: real OSM scenery along the map (forest/village sprites from real data), hills strip, a destination/route mode.
- ✅ (2026-10-11) **Full screen + mobile virtual buttons** — built, needs real-device testing (`docs/plan-done.md` "Test-drive racer game"). [ ] Still open: tilt steering, landscape lock, lower default resolution on touch — `GAME_PLAN.md`.
- [ ] Optional **music**: the original's track is licensed to that project only (Lucky Lion Studios) — not reusable. A CC0/CC-BY loop would be a separate lazy download (~1-3 MB) behind the sound toggle, with a credit line in the modal.
- ✅ Credits (javascript-racer, Kenney, and the CC BY 4.0 Sketchfab authors: animanyarty, MaG80, JUFF, mk2design, snafuj, Houdini1561, Han66st, cgart.com) are in `about.source.racer`.
- ✅ Models (2026-10-08): sedan, hatch, sport, SUV, pickup, van and bus are now CC-BY Sketchfab renders; the owner's other candidates were rejected for licence (CC BY-NC / "Sketchfab Standard") or because the body can't be tinted — see docs/plan-done.md "Racer art pass".
- ✅ Start settings: scenery, backdrop, lanes, traffic and resolution are random on every opening; the HUD lap/last/best readout is hidden (speed only).
- [ ] **Art-pass leftovers** (details: docs/plan-done.md "Racer art pass"): (a) delete the unused Kenney `van.webp`, `van-l/-r.webp` and their `-mask` files from `lib/racer/assets/` once `pnpm dev` is stopped (Windows holds them open; keep `van-gmc*`); (b) verify in the game: moto steering direction, the per-category top speed, the sunset/night/winter washes on all four backdrops (bus, sedan, hatch, sport, SUV, pickup and van steering/plates are verified); (c) more models from the owner (tractor, tow truck, a better motorbike, a replacement for the Kenney garbage truck; taxi/police/ambulance/fire done 2026-10-12 with siren + horn): GLB, CC0 or CC-BY (never CC BY-NC / "Sketchfab Standard"), closed rear, separate body material; (d) roadside trees/signs are still generated; (e) tune bus/moto size and plate rects; (f) the backdrop ridges are mirrored, so the centre peak is symmetric — more photos or a wider crop would fix it; (g) the banner appears 3 s after the card (xl+ only) — confirm that is what the owner meant.
- [ ] Remember the sound choice and the last settings in localStorage (today: sound off every open; settings only via the share link).
- [ ] Touch/mobile controls — deliberately out of scope (desktop only, keyboard).
- [ ] Track variety / a second track, ghost of the best lap, a local top-N lap table.
- [ ] Count game opens in `app.usage_events` (new kind in `ROUTE_KINDS` + `USAGE_KINDS` + the `admin.stats.kind.*` i18n keys) to see whether the banner earns its space.

### Wikimedia hero-image cache in Postgres + pre-warm — ✅ built and fully pre-warmed (2026-10-06); small tail left

Pre-warm finished over every model (steps 1-7 done 2026-10-05/06; table 112,398 rows, seed CSV `scripts/seed-data/wiki-images.csv.gz`
2.0 MB); **62.8% of registered cars have a photo**. The result-card hero now loads through the photo-only
`GET /api/wiki/image` (stored row → live fallback → per-kind placeholder) and the Wikipedia text loads only when its section
is opened. Design, schema, runbook, run log and the endpoint write-up are in `docs/plan-done.md` ("Wikimedia hero-image cache
in Postgres + pre-warm").
**Alias passes + coverage 62.8% → 99.1% (2026-10-09 … 10):** done — run log in `docs/plan-done.md` ("Wikimedia hero-image cache … alias passes").
**Origin label + "Update photo" + RAF-2203 alias (2026-10-12):** ✅ (`docs/plan-done.md`); refresh endpoint is unauthenticated — gate before a public deploy; add a RAF case to `wikiAliases.test.ts`.
**КРАЗ trucks (2026-10-11):** ✅ `--all-kinds` + KrAZ alias + `ru` lead edition — 64 of 118 КРАЗ groups have a photo (`docs/plan-done.md`). Other truck brands: see the 2026-10-13 line below (ГАЗ/ЗИЛ/ПАЗ/УАЗ/MAN/Mercedes vans done); МАЗ, КамАЗ, Renault, DAF, Volvo, Scania, Iveco, Mercedes trucks, trailer makers still to do.
**Soviet trucks + MAN + Mercedes vans (2026-10-13):** ✅ new `wikiSearchName` aliases (ГАЗ 51/52/53/66/69/21/24/3307/3110 + Gazelle 3302 family, ЗИЛ, ПАЗ, УАЗ-452, MAN TGX/TGS/TGA/TGL/TGM + L2000/F2000, Mercedes 4xx/6xx/8xx → Vario); re-scraped with `--aliased --all-kinds --min-cars 1 --brand X`, seed CSV re-exported (131,243 rows, 2.5 MB). Write-up in `docs/plan-done.md` ("Wiki photo aliases for trucks"). Biggest gaps left by cars: Mercedes trucks, Renault, DAF, Schmitz / Krone trailers, КамАЗ, Volvo, МАЗ, Iveco, Scania.
**Left (all optional):** (1) ~~resume `--aliased`, `--retry-failed`, export~~ done; (2) spot-check matches visually on real plates (Niva, Priora, Sens, Gazelle, Geely MK, Mercedes 200/230 → E-Class, UAZ 469 — needs plates from the user); (3) remaining `not_found` tail: Geely JL7162 / FE-2, Honda M-NV, СКС RDS-02РП, Fiat Grande Punto / Doblo Panorama, Kia Optima, Renault Taliant, ZAZ T13010 / TF69 (verify Chance), trim words ("307 xs 2.0 e", "pajero wgn 3.2 did") — each model < 300 cars; (4) check the offline `wiki` cap (200 entities) is enough now that every result fetches the photo. Ideas not done:
search by normalized name for odd spellings ("118 i" → "118i"); non-Latin article titles (zh/ja/ko) are mostly rejected by
the "title mentions the model" guard; a Wikidata `P18` query could replace the lead-image stage.

### Car reviews, videos, 3D & 360° — mostly shipped (2026-10-03 → 05); open items below

**Shipped** (details, findings and measurements in `docs/plan-done.md`, "Car reviews, videos, owner stories, press, 3D & 360°"):
infocar catalog + owner reviews, infocar videos (3,739), e-drive owner posts (62.6k), TopGear UK (1,032), itc.ua/mezha.ua test drives
(~310), Sketchfab 3D (7.8k) and CarShow360 360° (1,393) — all as committed CSV seeds loaded by `pnpm ingest:ratings:csv`.

**Open checks (nothing blocks them; do in a browser / with the registry query):**

- Browser pass over the whole reviews toggle: ВС6743РН (Kia Ceed 2012) and ВС4170МІ (BMW 328, 2013) for infocar; КА4845ІО (RAV4 2017)
  should show only 2015-2018 videos; Kia Sportage / BMW X5 / Mercedes for TopGear; ITC/Mezha row layout, logos, UA/RU/EN chips;
  a Kia Ceed II plate shows only 2012-2017 e-drive posts; the 360° modal (galleries without an interior view are untested).
- Measure and record: e-drive posts per brand and share of registry (brand, model) pairs with ≥1 post; TopGear coverage vs. infocar
  (expect lower: UK catalog); press/360° hit rates over the top 400 pairs. infocar match rate was measured 2026-10-03 (brand-page-only
  fallbacks 856k → 441k of ~12.2M rows over the top 800 pairs; remaining misses are mostly outside the catalog — per-model aliases are the next lever).
- carshow360: robots allow it but the origin is slow/flaky and ToS for embedding is unchecked — consider asking permission; `--enrich` not run.
- Small additions not done: AutoTrader UK search link (link only; the site is behind a Cloudflare challenge — never fetch it); an optional
  "search YouTube for this car" link in the Videos section (requested 2026-10-05, scope unconfirmed); YouTube Data API enrichment of
  the infocar videos (views, videos not on `/video/`; `GOOGLE_API_KEY` is in `apps/api/.env`, untested).
- Periodic refresh = re-run the ingest and re-export the CSV (new e-drive/TopGear items are rare; a `--since` shortcut could page only to the first known item).

**Further text sources (not started).** Checked 2026-10-02/03 (robots.txt + one page each):

| Source                                 | Lang                     | Access                                                                                                                                                                             | Role                                                       |
| -------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| infocar.ua `/test-drive/`, `/reviews/` | uk                       | open; no `/*?`, `/forum/`, `/search.html`; no sitemap → crawl brand pages. URL has brand/model                                                                                     | primary editorial                                          |
| avtoporadnyk.com.ua                    | uk                       | open, sitemap, model-tagged                                                                                                                                                        | editorial                                                  |
| auto-blog.com.ua                       | uk/ru                    | open, WP REST `/wp-json/wp/v2/posts`; filter to "огляди" category                                                                                                                  | editorial (low yield)                                      |
| nv.ua test-drive                       | uk                       | robots OK + sitemaps, but fetch got 403                                                                                                                                            | optional, skip if bot-walled                               |
| driver.top                             | uk                       | robots fully open, sitemap. **UGC social network** (`/car/ID`, `/exp/ID` posts, car profiles with engine/gearbox) — owner posts, not editorial reviews; some features premium-only | owner experience; check what `/exp/` really contains first |
| drive2.ru                              | **ru** (tag `lang='ru'`) | **robots.txt blocks every bot except Google/Bing/Yandex/Twitter/DDG/archive, incl. ClaudeBot/GPTBot; catch-all disallow**                                                          | **gated — see below**                                      |
| autoarmor.com.ua                       | —                        | shop reviews, not cars                                                                                                                                                             | dropped                                                    |

**drive2 gate (decision needed):** the owner logbooks are the best owner content,
but the site explicitly disallows our crawler; scraping it would go against its
rules and we won't evade them (UA spoofing, proxies). Options, in order:
(1) **link-only**: curated `drive2.ru/cars/<brand>/<model>/` URL per make/model,
tagged RU, no fetching — zero risk, ships in MVP; (2) ask drive2 for written
permission / an API or partnership, then add an adapter; (3) never: bypass.

**Step 2a — infocar video crawl ✅ (2026-10-04) and YouTube fallback ✅ (ingest 2026-10-05, lookup 2026-10-07, runs finished 2026-10-11):** 3,739 infocar videos + 2,320 YouTube videos for gap models; top-400 pairs 96.8 % covered. The no-video model list, tiers and the day-by-day run log are in `docs/plan-done.md` ("infocar video crawl and YouTube fallback — run log").

**Remaining (YouTube fallback) — the design, trial, language cascade, title filter and quota notes moved to `docs/plan-done.md`
("YouTube fallback for models with no infocar video — design, trial and build notes"):**

1. ✅ _done 2026-10-11_ — **Finish the runs:** ≥ 5,000 tier finished 2026-10-07 (Day 3), ≥ 1,000 tier finished 2026-10-11 (Day 7). `--min-cars 500` is deferred (≈ 9+ days for few, older-model videos).
2. **Generation/year matching** — _partly done 2026-10-11:_ a title year that falls inside a catalog generation now requires the car to be in that generation too (`videoLookup`, replaces the flat ±3 window); _generation words done 2026-10-12:_ a single standalone Wikipedia generation code in the title (`MK1`, `Mk 2`, `B8`; codes with a letter and a digit only, ambiguous titles ignored) pins the span (`titleGenerationSpan`, `ReviewsService` passes `GenerationsService.locate().list` for the fallback); **deliberately parked (2026-10-12):** year-less titles without a code (≈ 74% of rows) only get the publish-date ranking hint (e.g. Fusion 2008 lists a 2026 video first); coverage is already 88.5% of top-400 triples. If revisited: year from the video description (not stored today), or engine/body words matched against the Wikipedia specs. Original scope: parse a year or generation word (`MK1`, `Mk2`, `B`, `3`, `X`) from the title and map it to a generation
   year range via the infocar version catalog (as `videoLookup` does for infocar videos), else store the title year.
3. ✅ _done 2026-10-07_ — **`videoLookup` integration + UI label** — `youtube_videos` as a second source after the infocar ones (dedupe by `youtube_id`, infocar
   first, `MAX_VIDEOS` still caps the section), labelled as YouTube search results rather than infocar picks.
4. ✅ _done 2026-10-12_ — **Verify** (the "Done when" below) and measure again (via `/api/reviews`, dev API, DB with the Day 7 CSV: top-400 (brand, model) pairs **96.8%** with ≥1 video, 98.7% of their registrations (was 74.1%); top-400 (brand, model, year) triples **88.5%** with ≥1 video, 89.3% of their registrations; Lanos, Touran, Fusion, Lancer and Doblo each return 5–6 videos; RAV4 2017 returns the infocar video). Original wording: share of the top-400 pairs with ≥1 video (was 74.1% of registrations), share of
   lookups with a year-matched video.

_Done when:_ the no-video models in the Step 2a list (Lanos, Touran, Fusion, Lancer, Doblo, Laguna, Omega, ВАЗ 2107…)
show ≥1 video in the UI, the browser check (КА4845ІО RAV4 → 2015–2018 videos; a Lanos / Touran plate → videos) passes,
and the CSV is committed.

**Step 2d — Auto news (RSS): ✅ v1 built (2026-10-05)** — details, the source-verification table and the original plan are in
`docs/plan-done.md` ("Auto news (RSS)"). `pnpm ingest:news` (feeds in `scripts/news-sources.json`), `registry.news_items`, `GET /api/news`, homepage
`NewsTicker`, result-card 📰 News section (last) and a desktop-only scroll-in `NewsWidget`. **/news archive built 2026-10-06** (`c04716c`; write-up in
`docs/plan-done.md`, "Auto news archive"): paged list with outlet chips, date sort and title search, linked from the sidebar and the ticker. **Open:**

- **Schedule it:** cron on the VPS (Phase 4), daily per `SCHEDULE.md` (every ~6 h / hourly only if the tiny-window whole-site feed, mezha, should pay off). Not part of `ingest:all`.
- **Measure** (the plan's step 7): items/day per source, % tagged with a make / model, and for the top-50 registry (brand, model) pairs how many have ≥1 news
  item in 30/180 days — the DB has had one manual run so far.
- **English sources added 2026-10-05:** Car and Driver, Motor1, Carscoops (news + reviews) — verified, see the table in `docs/plan-done.md`. Open: the Ukrainian UI sends `lang=uk` so it never shows them; decide whether English items should appear for uk/ru users, and re-measure tag rates after a few days.
- **More sources:** topgir.com.ua added 2026-10-09 (`docs/plan-done.md`, "topgir.com.ua feed"); still to check: auto.ria.com/news, autocentre.ua, avtoradnyk, nv.ua/auto (robots first, then categories, then a tagger run on the real items).
- **Backfill** beyond the feed windows: `news.infocar.ua` paging and mezha's `/tag/avto/` HTML pages (robots check first) — not RSS.
- **Hot / News toggle** (the original design's `kind='hot'`: ≤7 days AND (model match OR new-models source)) — not built; the News section lists model then make news.
- Tagger limits seen: "Stellantis" resolves to Peugeot, "ID.4 and ID.5 → ID.Tiguan" to the Tiguan; brands outside the infocar catalog (Alpine) stay untagged.
- Browser-check the widget/section at tablet and phone widths (only desktop was checked); with the left sidebar open at ~1400 px the widget may overlap the card.
- Browser-check `/news` (chips, search, paging, shared URL, ua/ru/en) — built 2026-10-06, not verified in a browser by the author of this note.

**Step 2f — Brand YouTube channel videos: ✅ built (2026-10-06)** — design, discovery results and rejected options are in `docs/plan-done.md` ("Brand YouTube channel videos").
`pnpm ingest:social` polls 54 official channels (50 makes + 4 parent groups, `SOCIAL_CHANNELS` in `packages/shared/src/socialChannels.ts`) via their public RSS feeds
(no key, no quota) into `registry.social_posts`; `GET /api/social?brand=`; shown in the result card's **Videos** section as an "Official channel" strip under the infocar model
videos, with a Make / Group toggle where a make has a parent group. **Open:**

- **Schedule it:** daily (`SCHEDULE.md`); until a scheduler exists, run it by hand on every other environment (the strip is empty before the first run). Not part of `ingest:all`.
- **Coverage gaps (feeds were empty or stale on 2026-10-06):** Land Rover, Triumph, Kawasaki, DS, Dacia (own channel; Renault Group still covers it), Volkswagen Group, JLR (last upload 2023);
  no Stellantis channel found. Re-check from time to time, and add makes outside the table (e.g. Chery, Suzuki, Škoda-group sub-brands) after verifying the channel title with `ingest:social -- --dry-run`.
- **Regional channels:** Citroën uses Citroën do Brasil, Hyundai/Kia/Mazda/INFINITI the US channels — no active global channel was found. Ukrainian channels exist for Toyota
  (`UCj4tEdLmxjWXemSLOLu4XLg`), Škoda (`UCBAruWiHKmPN2RerZZVhMnA`) and Renault (`UCKDogp5MchjxMrJRr4EBWbA`) but are not added; decide whether to prefer a Ukrainian channel per UI language.
- **Not verified in a browser:** the Make / Group toggle, playing a channel video in the modal, narrow widths, ru/en labels (only the Audi plate КА6336СК was checked: 6 model videos + 8 Audi channel videos).
- Group-channel videos are corporate news, not model content — consider showing the Group tab only when the make channel is empty, or dropping it.
- The left gutter (1400 px+) is free again: a first "brand videos" side panel was built and removed the same day in favour of the Videos section; other left-hand widgets are to be discussed.

**Step 3 — infocar motorcycles (`moto.infocar.ua`), same ingest family, after Steps 1-2**

Same site family and robots.txt (checked 2026-10-03: disallows `/*?`, `/forum/`, `/account/`,
`/new_export/`, `/code_`, `BuBiNG` blocked; no crawl-delay, no sitemap), so the same polite
fetcher/cache/parser infrastructure applies. Structure differs from the car tree
(first look only — **verify against raw HTML**):

- Brands `/{brand}/` — 80+ (Suzuki, BMW, Honda, Ducati, Yamaha, Kawasaki, Harley-Davidson, KTM …).
- Models `/{brand}/{model}_{id}/` — **the model id is in the URL**, so URLs can't be built from a
  name; read them from the brand pages. Models show a production year range (2002–2023 seen),
  a review count and a star rating. There is no separate "version" level seen yet (check).
- Owner reviews `/{brand}/{model}_{id}/reviews/`; test drives under `/tests/`; videos on the site
  (YouTube embeds — same join-by-`youtube_id` idea as Step 2); news on `news.infocar.ua` (skip).
- Same rules: facts + links only (names, year ranges, review count/avg rating, URLs, video
  ids) — no review text/authors; never crawl `?` URLs.

Build deltas vs Steps 1-2:

- Add `vehicle_type` (`car`|`moto`) to `infocar_versions` / `car_videos` (or a parallel
  `moto_*` table if the model/version shape stays too different — decide after the first
  crawl); a moto row has `model_id` from the URL and year range at model level.
- **Matching is the real work**: the registry's motorcycle rows (`kind`, see
  `vehicleKind.ts`) carry free-text brand/model, and `brandLogo.ts`'s slug table is
  cars/trucks only ("does not cover motorcycle-only marques"). Needs its own moto brand alias
  list (Yamaha, Kawasaki, Harley-Davidson, KTM, Ducati …, Cyrillic/Latin spellings) — build it
  from the infocar moto brand list + the registry's distinct moto brands. Measure how many
  registry moto rows match before building UI.
- UI: show the "Reviews & test drives" block only when `resolveVehicleKind` says moto and a
  match exists, linking to the moto model page / reviews.
- Cost: 80+ brands + a few hundred models ≈ a few hundred requests (≈ 5-10 min at 1 req/s,
  unmeasured).

**YouTube env note (applies to any script using `GOOGLE_API_KEY`):**

- Env: `GOOGLE_API_KEY`. Only `apps/api` loads `.env` (`tsx watch --env-file-if-exists=.env`);
  `scripts/` run plain `tsx src/<file>.ts` and load none. So the video ingest script's
  `package.json` entry must pass `--env-file-if-exists=../apps/api/.env` (cwd is `scripts/`
  under `pnpm --filter`), read the key with a Zod-checked, scripts-local env read, and exit
  with a clear message when it is absent (the key is optional — see ordering below). The key
  is server/script-side only; never ship it to `apps/web`, never log it, never put it in a
  URL that gets logged or cached (`?key=` goes in the request only; redact on errors).

Open questions: driver.top `/exp/` content quality and ToS; drive2 permission route; whether to show owner posts (driver.top) in the same block as editorial reviews or a separate tab.

### Fuel economy & emissions (CO2) — built (2026-10-02), tuning left

**Shipped:** one `registry.fuel_economy` table for every source (`source`, `cycle`, `powertrain` columns): EPA
(fueleconomy.gov zip, 50k rows) + EEA (EU, WLTP from 2018/19, NEDC before; 2010-2025, ~221k rows — the EEA DiscoData SQL
endpoint groups ~10M registrations a year server-side to ~10-25k groups, so no multi-GB download; the 2023 table name
is probed). 118 MB in Postgres, 4 MB gz committed CSV. Matching (`packages/shared/src/fuelMatch.ts`, one code path for
the API and the stats script): same make, model prefix either way, nearest year within +/-3, powertrain from the registry
fuel combo, engine capacity +/-12%, one source per estimate (EEA before EPA on ties). `GET /api/fuel` + `CO2Badge` in a
collapsed "Show emissions" section on the result card; `GET /api/fuel/stats` + `/fuel` page backed by `registry.stats_fuel`
(`pnpm db:refresh-fuel-stats`). **Coverage: 66% of registered passenger cars** (EPA alone ~37%; EEA from 2015 only ~51%).
**Left / ideas:** the score cap (`CO2_SCORE_MAX_G_KM` = 300) is untuned — EPA numbers read high, EU WLTP low, so the
scale should be tuned once; cars built before ~2007 can only match US-spec EPA rows (artificial cliff on the /fuel
by-year chart) — an EEA-independent older source (UK VCA, NRCan) would fix it; VinResult has no emissions section;
Soviet/Daewoo/ZAZ models have no source at all; reference links live in `CO2Badge.helpers.ts`.
**Also shipped 2026-10-02** (details in `docs/plan-done.md`): WLTP/EEA/EPA explainer, expandable cleanest/dirtiest
lists, `/api/stats` split into `/top` + `/field/:dimension`, fuel/crash-test ranking chips on the result card, `/safety`
combined crash-rating page.

**Refresh cadence:** manual/annual (EPA ~2x/year, EEA once a year, no cron); `export:fuel:csv`, then commit the gz CSV. Sources, design and full cadence notes: `docs/plan-done.md`.

### VehiclesDB cross-market data — ✅ built (2026-10-07), small follow-ups left

Catalog (`registry.vdb_models`, CC BY 4.0), shared matcher, `GET /api/vdb` + `/api/vdb/stats`, result-card chips (UA-only, also sold
in, popularity band, rare elsewhere, "?" popover with all 15 countries), `/stats` Markets panel, About credit. **Coverage: 92.6% of
passenger cars** (models with a catalog entry). Full write-up: `docs/plan-done.md` "VehiclesDB cross-market data"; status, gaps, matching
rules and refresh rules: `DATASETS_PLAN.md`. **Built since (2026-10-08):** cross-make alias chip, one decimal for <1% shares, "approximate match" note
for prefix matches, the full 108-pair plate-region table (stage A), motorcycle/truck/bus matching + per-class `/stats` (stage B) — see
`docs/plan-done.md`. **Left:** the `plates/ua.yml` cross-check of `normalizePlate`/`regions.ts`; the gor3a/autoevolution specs source
stays blocked (they want to see the public app first). **Gate before deploy (Phase 4):** every external dataset
needs its licence/permission recorded and attribution on About (VehiclesDB done).

### Open-data round 2 — recalls, complaints, specs, MOT faults, EV data — **licences verified 2026-10-07; RDW specs built 2026-10-08, rest not started**

- ✅ Stage K leftovers, K-M4 → K-M7 (motorcycles, buses, curated seed; 2026-10-12) — all done; the step log moved to `docs/plan-done.md` ("Stage K-M leftovers log"). Counts at close: generations 1,213 / wikispecs 1,206.

**Built:** ✅ /stats, /fuel, /safety section explanations + sources, collapse-all button on plate/VIN pages only (2026-10-11; `docs/plan-done.md` "/stats, /fuel, /safety explanations"). Spec rankings (power / engine / height / length / fuel tank) + section skeletons (2026-10-11; `docs/plan-done.md` "Spec rankings + section skeletons"). Stage K follow-ups (2026-10-12; `wikiSpecs` in the card bundle, engine/chassis code split, stale alias notes; ✅ engine vs chassis codes stored separately (gearbox words and trailing hyphens dropped); `docs/plan-done.md` "Stage K follow-ups"). Wikipedia generation specs (stage K, 2026-10-11; engines per generation, drive, gap dimensions; `docs/plan-done.md` "Generation specs from Wikipedia"). Car generations (stage I, 2026-10-11; `docs/plan-done.md` "Car generations"). Transport Canada recalls with no US twin (stage H, cut down; `docs/plan-done.md` "Canada recalls"). RDW specs (the "Specs" block, stages C/C2/C3 + regroup) — `docs/plan-done.md` "RDW specs (EU / NL)". RDW recalls (stage D) and C4
(estimated value) are built (2026-10-09); stage M (model alias unification, M1–M3) is built (2026-10-10; M4 stats grouping built too — `docs/plan-done.md` "Model alias unification"); stage E (Open EV Data, "Electric" block) is built too (2026-10-09; the upstream data is frozen at 2020); stage F (NHTSA recalls + owner complaints, live API + cache, merged into the Recalls block) is built too (2026-10-10; `DATASETS_PLAN.md` "Stage F — done"); ✅ stage G (UK MOT "Common faults": fail / advisory rates by mileage from DVSA 2021–2023, lazy section `faults`, 64 MB of tables, 3.2 MB seed) is built (2026-10-10; `docs/plan-done.md` "UK MOT Common faults"). Details, licences, URLs, caveats and the skip list:
`DATASETS_PLAN.md` ("Round 2"). Buildable (all free, own tables, each a
removable card block, credit on About): **RDW** registered vehicles (CC0; "Specs") + RDW recalls (CC0), **NHTSA** recalls +
complaints (public domain, live API like `api/safety`), **UK MOT** (OGL v3; "Common faults", years 2021–25 loaded ✅ — Stage G2 in `DATASETS_PLAN.md`), **Transport
Canada** recalls (OGL-Canada, low priority), **Open EV Data** (MIT; "Electric" block). Order: RDW -> NHTSA -> EV -> Canada -> MOT. **Refresh cadences** (RDW specs 6 mo, RDW recalls monthly, NHTSA live + cache
7/30 d, MOT yearly, Canada quarterly, EV quarterly) are in `DATASETS_PLAN.md`; **each source's ingest, seed, refresh command and
`SCHEDULE.md` entry are implemented only when its card block is built** — nothing ahead of the feature.
Recalls are model-level and market-labelled, never "your car has a recall"; this revisits the 2026-09-24 park in "Phase 3+ —
recalls" above (open owner call: NHTSA recalls or RDW/EU only). **Skipped:** Eurostat (country totals only), ANCAP / Latin NCAP /
ASEAN NCAP (no licence/permission), Kaggle sets, DVSA recalls API. Wikidata deferred. data.gov.ua is a separate session.
**Stage J (other countries' open data: KBA, DataVic, MLIT, Korea) — ⏸ skipped for now (owner, 2026-10-13); research found nothing worth building (country-level totals add little to a result card, DataVic has no model year, MLIT/Korea have no confirmed open data), revisit only if asked;** short licence re-check and findings in `DATASETS_PLAN.md` "Stage J".

### Car dimensions (automobiledimension.com) — **waiting for the owner's permission (asked 2026-10-07)**

Source: `automobiledimension.com/<make>-car-dimensions.html` (per brand: model, year, thumbnail, L×W×H mm, boot dm³, fuel
icons) -> `/model/<make>/<model>` detail pages (width incl. mirrors), `/previous/<make>` for older generations. No API.
robots.txt allows everything, but **Terms and Privacy (`/terms-privacy.html`) forbid** commercial use/public exhibition and
"inclusion, in whole or in part, on other websites … without prior authorization"; linking is allowed with attribution.
So showing their data/images (hotlinked or re-hosted) needs written permission. **Message sent via their contact form
(≤283 chars) — blocked until they answer; do not build before that.**

- **If they agree:** crawler `scripts/src/dimensions.ts` like `ingest:infocar` (1 req/s, robots-aware, HTML cached, `--brand`/
  `--limit`/`--dry-run`/`--refresh`) -> `registry.car_dimensions` (make, model, generation/year, length, width, width with
  mirrors, height, boot, `source_url`, `image_url`) + `:csv`/`export:*:csv` seed; match to registry models like press/infocar;
  "Dimensions" block + thumbnail on the result card with credit and a link to their full page (images stored as the owner
  allows). ~1.5-3k pages, ~30-60 min cold.
- **If only a link/credit is allowed:** store just `source_url` per model, no facts/images.
- **If no / no reply:** drop it; alternative = Wikidata/Wikipedia infobox dimensions (CC) like the Wikimedia hero photos.

### Spec-page ideas from carsized.com / autosize.org — **researched 2026-10-10, nothing started**

**Policy: do not scrape or reuse either site.** carsized.com robots.txt blocks only `/cdn-cgi/` (plus Meta crawlers); its terms
could not be fetched. autosize.org answers 403 to bots (bot protection) and its footer says "© 2026 AutoSize. All rights reserved".
Their photos, 0-1000 ratings, "who it suits" texts and compiled tables are theirs; the underlying facts (dimensions, fuel use,
recalls, NCAP stars) come from public sources we already use. Everything below is built from our own / open data. Owner decisions
(2026-10-10): ~~no multi-car compare / duel / overlay (skipped)~~ **reversed 2026-10-29: compare is planned, after the
catalog pages** (see "Car compare" below); no contact with the site owners.

**Group 1 — own data, new UI (no new source)**

- Single-car **dimension callouts** over the hero photo (length / width / height / clearance lines, like the AutoSize hero) from RDW
  Specs; no second car.
- **Fits my garage / parking bay** check: user enters a space (stored per account or localStorage), card shows pass/fail from RDW width
  (+ mirrors if known) and length.
- **Running-cost line**: consumption (RDW/EPA) x current UA fuel price; reuse C4 customs + NBU currencies. Fuel-price source TBD.
- **Ukrainian cost items to verify**: OSAGO category by engine volume, luxury-car tax (price/age thresholds), road-tax-free band.
  Each needs an official source read first; hide when unsure.
- **Rule-based "Who it suits"** sentence generated from our numbers (length, boot, seats, power, 0-100), translated via i18n keys.
  Our own template text, never AutoSize's wording.
- **Engine/trim table** (RDW variants grouped by engine: kW/hp, torque, 0-100, top speed, Euro class, CO2, gearbox, drive, L/100 km,
  MPG) as a collapsible block; tyre-size column only if a verified source appears.
- **Fleet context** (already unique to us): units in UA, regions, colours, years; **import-market view** (EU / US / JP share via
  registry + VehiclesDB markets); **variants actually sold in UA** from registrations.
- **Segment-peer list** — a mini-compare; do it with "Car compare" below.

**Group 2 — Euro NCAP (already ingested; improvements only)**

- State: `scripts/src/euroncap.ts` scrapes euroncap.com (sitemap discovery, 1 req/1.5 s, identifying UA, robots-aware) into
  `registry.euroncap_ratings`, committed as `euroncap-ratings.csv.gz`. **No licence/terms review is recorded** for it (the round-2
  sources each got one). **Terms read 2026-10-10 (`DATASETS_PLAN.md` "Euro NCAP terms"): not cleared** — content is copyrighted,
  commercial reproduction "not authorised", prior permission needed for text and multimedia. **Before deploy: stars + percentages +
  source link only; drop images/videos/logos and copied wording unless Euro NCAP permits.**
- Ideas: stars + the four percentages (adult / child / vulnerable road users / safety assist) in the spec summary; test year and
  protocol badge ("2012 results, older protocol — not comparable to current stars"); link every star line to the source page.

**Group 3 — more open sources (already in DATASETS_PLAN, order unchanged)**

- NHTSA recalls + complaints (stage F, owner call pending), UK MOT "common faults" (OGL, 2021–25 loaded), Transport Canada recalls
  (low), RDW recall refresh. Maybe: other national open registers (Norway, Sweden, Estonia, Latvia) as an RDW cross-check for models
  RDW lacks; **each needs a licence read before use**.

**Group 4 — Wikidata (CC0)** _(kept separate from Wikipedia and Commons)_

- Generation list via P179 "part of series" + P155/P156 previous/next; ua/ru labels from sitelinks (stage I, step 1).
- Predecessor / successor model links, production start/end (only ~58 of 943 generation items have dates), body type, platform,
  manufacturer, country of origin, assembly plants.
- Stable `wikidata_id` as a join key for generations, photos and links across the other sources.
- P18 (image) and Commons-category pointers for the Group 6 photo work.

**Group 5 — Wikipedia text + infobox (CC BY-SA; facts only, credit + link)**

- Generation fallback when Wikidata has no items: prefix search ("BMW 3 Series (") and main-article **section headings**
  ("Third generation (J12; 2021)") give number, code and start year (stage I, steps 2-3).
- `{{Infobox automobile}}`: production / model years, body styles, platform, **dimensions, wheelbase, kerb weight, engines,
  transmissions** — a free fallback for models RDW lacks, and the "if no" alternative already noted under automobiledimension.com.
  Parsing traps: regional production years, `<ref>`, nested templates.
- Localised article titles (ua/ru) and the existing wiki text/summary on the card; facelift and regional articles as flagged rows.
- Per-model **"also sold as"** (badge-engineered twins) from infobox / disambiguation lines — complements VehiclesDB aliases.

**Group 6 — Wikimedia Commons (per-file licences; credit author + licence)**

- **Generation-specific photos**: file names carry the code (XV40, JD); pick by the car's year (stage I UI idea). Extends the
  existing wiki-images pipeline and `wiki-images-coverage.ts`.
- Side-profile / front-three-quarter selection for the dimension-callout hero (Group 1), with a licence + author field per image.
- Colour variants, interior and engine-bay photos for an optional gallery; a background-removal pass for cut-outs only if the
  licence allows derivatives (CC BY-SA = share-alike, check before storing edited copies).
- Coverage report: which (brand, model, generation) pairs have no usable photo, to drive manual picks.

**Suggested order:** Group 2 licence check (small, unblocks honest credits) -> stage I (Groups 4+5 core) -> Group 6 generation photos ->
Group 1 dimension callouts + garage-fit -> Group 3 (existing order). Owner says "go" per item.

### To discuss / research

- [ ] **Driver assist + CarPlay / Android Auto** — researched 2026-10-28, not started. Owner says "go" per step. **Step 1 ✅ 2026-10-28** (ASSISTS extended, SAE level, US-spec footnote, shareable plate-card section with explainer; see features-reference "VIN page" > Driver assists). **Step 2 ✅ 2026-10-28** (EU GSR2 baseline by model year, `vin/gsr2.ts`; seen working on Porsche Taycan 2023 НС0500YС). Steps 3-4 optional, ask the owner first. Open polish (owner not yet decided): the NHTSA chips (US spec, ✓) and the EU baseline chips (dashed) can look contradictory on one card (e.g. a US-decoded Taycan) - add a separator line ("above: decoded equipment; below: what EU law required") and/or hide baseline chips whose system already shows ✓. Polish ✅ (divider + note on top). ADDW and pedestrian/cyclist AEB rows ✅ (second GSR2 stage). VIN page baseline ✅ (`VinTypicalEuBaseline`, inside "Typical model data", only when the NL register knows the model). Step 4 link-out ✅ (`VinSmartphoneLinks`; curated CSV not built).
      **Legal (verified 2026-10-28): do NOT scrape Apple's CarPlay list or Google's Android Auto page.** Apple site terms ban
      "page-scrape / robot / spider" and copying (robots.txt is open, the ToS still applies); Google terms ban scraping content
      "that doesn't belong to you"; EU database right covers the compilation even though single facts are free. No open dataset
      and no Wikidata property exists. Allowed: link-out, or a hand-written table from manufacturer pages (same rules as
      `wikispecs-curated.csv`: facts only, one citation per row, nothing copied). Not legal advice; ask a lawyer before any scrape. - [ ] **Step 1 — NHTSA vPIC ADAS chips (do first, no new source).** The VIN decode already gives `vinFields`
      (`Map<name, value>`, see `SteeringChip` in `ResultCard.tsx` / `VinResult.tsx`). First check what a real decode returns:
      call `GetVehicleVariableList` and decode ~10 VINs (US 2018+, EU, Tesla, pre-2015) to see which ADAS variables are
      filled (expected: Adaptive Cruise Control, Lane Departure Warning, Lane Keeping, Lane Centering, Forward Collision
      Warning, Automatic Emergency Braking, Blind Spot Warning, SAE automation level). Then a `DriverAssistChip`/section in
      `components/vin/` with `helpers.ts` parsing (values are "Standard" / "Optional" / "Not Applicable" / empty), hidden when
      nothing is filled, "standard vs optional" wording and a footnote that it is the US-market spec. If the data comes via
      the API instead, the contract goes in its own file with `.nullable().optional()`. i18n ua/ru/en, About source line,
      `releases.ts` entry. Never say "has autopilot": only SAE level + listed systems. - [x] **Step 2 (done 2026-10-28) — EU baseline by first-registration date (GSR2).** For EU/RDW cars, derive "mandatory since" systems (AEB,
      lane keeping, intelligent speed assistance, driver drowsiness) from the first-registration date: new types from
      2022-07, all new cars from 2024-07. Label it a legal baseline, not the car's equipment. Verify the exact dates from the
      EU regulation (2019/2144) text before coding. - [x] **Step 3 (optional) — Tesla (done 2026-10-28, `teslaHardware`).** Only if the decode names Tesla: "Autopilot hardware" chip, no FSD claim (software
      subscription, no public source). - [x] **Step 4 (done 2026-10-28, `VinSmartphoneLinks`) — CarPlay / Android Auto.** Link-out "Check CarPlay / Android Auto support" to Apple's and
      Google's own pages (like the AUTO.RIA link-out). A curated CSV of the top ~50 models only if the owner wants it, built
      by hand from manufacturer pages, with a citation per row. - **Worth it?** Step 1 yes (cheap, accurate per VIN). Step 2 yes (cheap, honest). Steps 3-4 only if time. Full
      scraped database: no.

- [ ] **Model catalog year pages `/cars/:make/:model/:year`** (block 4) — model and make pages are live (see the ✅ catalog entry above); year pages wait for Search Console to index the first 300 pages (check about 2026-11-13). Plate-free model pages
      (registry stats + the existing model-level sections) as indexable SEO slugs; needs a canonical make/model taxonomy
      (registry models are trim-level) and TS-built rollup tables, not a matview. Full write-up: [docs/catalog-plan.md](docs/catalog-plan.md).
      Discovery checklist around it (Search Console, IndexNow, outreach, Reddit draft): [docs/discovery-plan.md](docs/discovery-plan.md).
- [ ] **Compare two vehicles `/compare`** — **phase 1 (core) done 2026-10-30** (route, plate/VIN/model resolver, mirrored pruned table, coverage strip, chips); phase 2 done 2026-10-30 (adds ranges, stars, CO2 scale, price / MOT curves, generations timeline, fit verdicts, PNG; open: depreciation and registrations curves); phase 3 export core done (`CompareExportButton`; open: pictures and the new blocks in docx/pdf); phase 4 client side done (tray, slot B suggestions, saved comparisons; open: tray outside the catalog, indexable pairs, `GET /api/compare`, `/read` embeds). Exactly 2 vehicles;
      input per slot = plate, VIN or model ref (so any vehicle we hold data for, not only catalog models). Mirrored table that hides rows
      with no data on either side, radars (fixed scales, only axes both cars have), mirrored/dumbbell/share bars, depreciation and MOT curves,
      size blueprint overlay, generated difference sentences, export like "Copy all info", "Compare" chip on the plate/VIN card and catalog
      page (slot A prefilled). Phases: (1) core, (2) visuals, (3) export, (4) tray / suggestions / saved / indexable pairs.
      Full plan: [docs/compare-plan.md](docs/compare-plan.md). Also covers the segment-peer list and a `/read/sizes` overlay embed.
- **Shareable photo-search links** — idea 2026-10-01, deferred (not started).
  Share button on the photo card uploads the shrunk image + recognition result
  (candidates with boxes, EXIF meta) to `POST /api/shares`; opening
  `/<plate>?p=<token>` fetches it and fills the same `photo` state in
  `use-plate-recognition.ts`, so the UX matches a local upload with no
  re-recognition. Storage: `registry.shared_photos` (`id` token, `image bytea`,
  `candidates jsonb`, `meta jsonb`, `created_at`, `expires_at`); image served
  from `GET /api/shares/:token/image`, also used as `og:image` by the existing
  meta-injection. Open decisions: strip EXIF GPS by default (opt-in to include),
  expiry (~30 days), upload throttle (~10/h/IP), re-encode to JPEG/WebP, show
  "public to anyone with the link" notice, keep `/api/shares` out of the
  offline cache. Move blobs to disk/S3 in Phase 4.
- **Show key "test drive" facts for a looked-up car** — surface curated
  specs/review highlights (not just registry fields) for the car's
  make/model/year. Needs a data source: is there a free API, or does this
  require licensing/curating content ourselves?
- **Auth with Google** — Phase 5 already specs Passport Google OAuth; open
  question is scope beyond syncing history/favorites to the cloud — what
  else should be account-gated (cross-device sync, data export, change
  alerts on a saved plate/VIN)?
- **Use more of the NHTSA vPIC decoder surface — researched, nothing left worth adding (2026-09-24)** —
  full endpoint catalog enumerated from `vpic.nhtsa.dot.gov/api/`: Decode
  (`DecodeVin`, `DecodeVinValues` flat, `DecodeVinExtended`,
  `DecodeVinValuesExtended`, `DecodeWMI`, `DecodeVINValuesBatch`), Manufacturer
  (`GetAllManufacturers`, `GetManufacturerDetails/{id}`,
  `GetWMIsForManufacturer/{id}`), Make (`GetAllMakes`,
  `GetMakeForManufacturer`, `GetMakesForManufacturerAndYear`,
  `GetMakesForVehicleType`), Model (`GetModelsForMake(Id)`,
  `GetModelsForMake(Id)Year`), reference (`GetVehicleTypesForMake(Id)`,
  `GetVehicleVariableList`, `GetVehicleVariableValuesList`), misc
  (`GetEquipmentPlantCodes`, `GetParts`, `GetCanadianVehicleSpecifications`).
  Checked the two candidates that looked promising against a real VIN:
  - `GetManufacturerDetails/{id}` — company-registry metadata (address,
    contact info, `DBAs`, `ManufacturerTypes`, `VehicleTypes` GVWR ranges,
    `PrimaryProduct`) about the _manufacturer as a company_, not the car. No
    end-user value on a result card, none of it overlaps or extends the
    per-VIN decode fields.
  - `DecodeVinValues` (flat single-object shape) — same ~95 fields
    `DecodeVin` already returns, just reshaped from variable/value pairs into
    one object. No new data (this is on top of the already-resolved
    `decodevin` vs `DecodeVinExtended` comparison from Phase 1.5).
  - Everything else in the catalog (Make/Model/vehicle-type/WMI/plant-code
    lookups) is reference data for _building_ a decoder, not for enriching a
    single VIN's result — not applicable here.
    **Conclusion: not pursuing further vPIC surface.** `/api/vin/:vin` already
    forwards the richest endpoint (`DecodeVin`) and the UI already renders every
    non-empty field. Crash-safety/recall data from the separate
    `api.nhtsa.gov/SafetyRatings` and `/recalls` APIs was a different topic,
    researched separately for a different reason (US-market-only relevance, not
    decoder coverage) — ratings shipped, see Phase 1.5's "Crash-test safety
    ratings" entry; recalls are still parked, see "Phase 3+ — recalls" below.
- **Self-host NHTSA's own data instead of proxying it live — researched,
  deferred (2026-09-25).** Prompted by the Euro NCAP CSV export/import work
  (see Phase 1.5) — same instinct ("keep a local copy, depend on the external
  source as little as possible") applied to the two things `VinService` and
  `SafetyService` still live-fetch per request.
  - **vPIC VIN-decode database — deferred, bigger lift than it looks.** NHTSA
    does publish this for exactly this purpose:
    [vpic.nhtsa.dot.gov/Downloads](https://vpic.nhtsa.dot.gov/Downloads) ships
    a monthly PostgreSQL custom-format dump (`vPICList_lite_*.custom.zip`,
    ~70 MB zipped) — no format conversion needed, we're already on Postgres.
    The catch: it's a decode-_only_ schema (~100 tables of WMI patterns, VDS
    decode rules, code tables) — `VinService.decode()` would have to
    reimplement NHTSA's own pattern-matching decode algorithm against those
    tables, not just persist pre-decoded rows the way the Euro NCAP scraper
    does. That's a real project on its own, closer to Phase 3/4 scope than a
    quick follow-up. **Decision: keep `/decodevin` live-proxied as-is** — it
    already works fine locally behind the existing bounded in-memory cache.
  - **NHTSA Safety Ratings bulk data — deferred, cheaper if it comes back
    up.** `data.transportation.gov` hosts "NCAP 5-Star Safety Ratings" as a
    Socrata dataset, exportable in full as CSV/JSON — the same shape as the
    Euro NCAP scrape (bulk rows → one table → replace `SafetyService`'s live
    two-step `api.nhtsa.gov/SafetyRatings` walk). Crash photos/videos would
    stay referenced URLs, never downloaded — the same "media stays linked,
    never rehosted" rule already applied to Euro NCAP. Not started; revisit
    if/when the NHTSA tab's live dependency becomes an actual problem (rate
    limits, downtime) rather than a theoretical one.
- **Укртрансбезпека КТЗ certificate registry — watch, not usable yet (2026-10-03).**
  "Реєстр сертифікатів затвердження типу та сертифікатів відповідності колісних ТЗ і обладнання"
  (КМУ постанова №715, 18.06.2024; pilot since 19.12.2025; fully operational 2026-09-01; electronic-only
  certificates from 2026-09-27). Holds type-approval, conformity and individual-approval certificates.
  Per vehicle _type_, not per car, so no help for plate lookup. Possible later value: technical specs
  (mass, dimensions, engine, emissions) on VIN pages where NHTSA decode is weak (EU/Asian cars).
  **Blocker:** no public search, open-data download, API or data.gov.ua dataset found — access is for
  manufacturers, certification bodies and state authorities. Sources: dsbt.gov.ua/reiestry/reiestr-sertyfikativ-ktz.
  Re-check dsbt.gov.ua and data.gov.ua in a few months (~2027-01) for a public extract.

### Parked — no free API token (same class as Platesmania)

- ⛔ RIA "similar cars" — see Phase 2, blocked on a `developers.ria.com` key.
- ⛔ Platesmania — see Phase 3, no free token, scraping ruled out.
- ⛔ **Vehicle history/images from other countries, by VIN** — e.g.
  `copart.com`, `bid.cars` auction listings for imported vehicles. No free
  API token surveyed yet for any provider; scraping these sites is the same
  ToS/legal no-go as Platesmania, not a fallback. Revisit if a free/affordable
  token turns up for one of these or a similar provider.
- ⛔ **Ukraine average fuel prices — researched, parked (2026-09-24)** —
  wanted price-per-fuel-type data (e.g. estimated fill-up cost on a result
  card). [serg-ill/ukraine-fuel-prices](https://github.com/serg-ill/ukraine-fuel-prices)
  turned out not to be a usable data source at all: it's a Home Assistant
  custom component (Python) that scrapes 12 gas-station-network sites plus
  Minfin hourly, with no hosted API and no dataset files — using it means
  reimplementing its scraping, not consuming an API. Went to the underlying
  source instead (`index.minfin.com.ua/ua/markets/fuel/`): its A-95/A-92/diesel/LPG
  averages are licensed from **Консалтингова група А-95** (`a95.ua`) per the
  page's own schema.org `creator` attribution — a commercial market-research
  firm whose product _is_ this price data. Checked a95.ua directly: no public
  API, no free tier, no listed licensing terms, contact-them-only access.
  `robots.txt` doesn't block the page, but that's a weak signal against a
  paid third party's commercial dataset republished with attribution, not
  Minfin's own open data. **Decision: skip scraping** — same ToS/licensing
  risk class as Platesmania and the Copart/bid.cars entry above (no free
  API, scraping licensed commercial data as the only alternative). Revisit
  if A-95 Consulting Group offers a free/affordable API or data license
  (contact: a95@a95.ua), or if a genuinely open fuel-price source turns up
  (e.g. a state statistics service, or networks that publish their own
  prices under an open license).
- ⛔ **New-car MSRP + specs from official distributor sites (UA and
  EU/US fallback) — researched, parked (2026-09-25)** — asked: can we pull
  real current model prices from Ukraine's official brand distributors
  (Toyota/UkrAVTO, Škoda/Eurocar, Hyundai Motor Ukraine, Winner Group
  (Ford/Volvo/JLR/Porsche/MG), UkrAVTO's other marques (Mercedes, KIA,
  Chery/Jetour, Geely, ZAZ), BYD/BBCars, etc.), falling back to EU/US
  manufacturer sites, and is there a free RIA-like API covering all
  makes' prices + specs. Findings on all three:
  - **UA distributor sites**: no brand publishes a price API — Škoda's
    is PDF price-list downloads (`skoda-auto.ua/owners/price-lists`),
    others are plain marketing HTML with no structured feed. There isn't
    one "Ukrainian official sites" set either — each brand has its own
    distributor/dealer-group site (UkrAVTO alone runs Toyota, KIA
    (Falcon-Auto), Mercedes (Avtokapital), Chery/Jetour, Geely, ZAZ under
    separate sub-brands), so covering "all real models" means ~15-20
    independently-run sites, each needing its own PDF/HTML parser that
    breaks on redesign — before even reaching the ToS question. Same
    scraping-a-commercial-site's-priced-catalog risk class as Platesmania
    and the fuel-price entry above, times ~15-20 sites instead of one.
  - **EU/US fallback**: doesn't solve pricing either. The free, official,
    no-auth options that exist (`fueleconomy.gov/ws/rest` — EPA/DOE MPG +
    CO2 + spec data; NHTSA vPIC, already used for VIN decode; the EU
    type-approval register on `data.europa.eu`) all carry technical specs,
    **not retail prices** — MSRP is a national/dealer-network decision the
    EU/US regulators never collect. Manufacturer configurators
    (toyota.com, vw.com, bmw.com) don't expose a public pricing API either.
  - **Free RIA-alternative with prices + specs, surveyed**: CarAPI
    (`carapi.app`) — free tier is unauthenticated but capped to 2015-2020
    Ford/Toyota only, full MSRP coverage is a paid plan ($199-299/yr).
    API Ninjas Cars API — free tier has no price/MSRP field at all (specs
    only), and its own terms forbid commercial use on the free tier
    regardless. CarQueryAPI — dead, unmaintained since 2019. Auto-data.net
    / Car2db — paid, demo key only. No free source currently combines
    current prices with specs across makes, for UA or elsewhere.
  - **Decision: skip building any distributor-site scraper.** The one
    actually-viable path for real market prices remains what Phase 2
    already tracks: a `developers.ria.com` API key (AUTO.RIA already
    aggregates UA dealer listings/prices under one API) — pursue that
    token, don't route around its absence with N one-off site scrapers.
    Revisit only if a free/affordable all-makes pricing API turns up, or
    a specific brand's distributor ships a real public feed (not a PDF).

- ✅ Export polish: prettier PDF / Word done 2026-10-27 (verdict banner, origin timeline, table polish, cover strip; `docs/plan-done.md` "Export polish"). Skipped on purpose: country flags in origin rows, extra chart types, a PDF layout library.
- ✅ About page refresh (Cloudflare source, discuss + share features) and photo-search timeout fix done 2026-10-27 (`docs/plan-done.md` "About page refresh").

## Phase 4 — VPS / production

The recurring-job plan (cadences, locking, run log, alerting, build steps) is drafted in [SCHEDULE.md](SCHEDULE.md) — build it as part of this phase.

VPS sizing, provider shortlist (Contabo Cloud VPS 6), static IP and DNS: [docs/deploy.md](docs/deploy.md) "Sizing and provider".

- ✅ Load-performance pass done 2026-10-09 (lazy sections, per-language i18n, chunk groups — `docs/plan-done.md` "Load-performance pass").
  **Remaining load-performance actions (value order; context in "Load-performance pass"):**
  1. [x] Measured 2026-10-28 on carsua.app (Fast 4G, 4× CPU): LCP 1174 ms, **CLS 0.79** (`Presence` animating open after load; fixed in code) — `docs/plan-done.md` "Load-performance pass". ✅ Re-measured 2026-10-29: **CLS 0.01**, LCP 1362 ms, 103 requests, PostHog 225 ms; Lighthouse mobile a11y 96 / BP 96 / SEO 100. ✅ `color-contrast` fixed and verified 2026-10-29 (`CO2_BAND_TEXT_COLOR`; Lighthouse mobile a11y 100 on `/` and on `/fuel`, light and dark). ✅ Found on `/fuel` and fixed in code 2026-10-29: CLS 0.22 (the bare route `Spinner` left `QuickLinks` in the first screen, pushed out when the chunk rendered; the `Suspense` fallback in `App.tsx` is now `min-h-svh`) and axe `td-has-header` (`PowertrainDetail` name cell is `<th scope="row">`, the empty header has an sr-only label). ✅ Re-measured after deploy 2026-10-29: `/fuel`, `/safety`, `/about` all CLS 0.00 (`docs/plan-done.md` "Load-performance pass"). ✅ `td-has-header` re-checked on `/fuel` after deploy 2026-10-29: passes (mobile a11y 100). ✅ `inspector-issues` found 2026-10-29: two Report-Only CSP `eval` violations from our own Zod chunk (`z.config({ jitless: true })` ran too late: Zod reads it when a schema is constructed, and the schemas chunk evaluated before `main.tsx`); fixed in code (`lib/zod-config.ts` first import + `vendor-zod` / `zod-config` chunks in `vite.config.ts`), ✅ re-measured after deploy 2026-10-29: `/fuel` mobile a11y 100, best practices **100**, SEO 100, console clean. The `deprecations` audit (FencedFrame, StorageType.persistent, Protected Audience) failed on the 77 run (best practices 77 on `/fuel`) and passed on the 100 run: it comes from (FencedFrame, StorageType.persistent, Protected Audience) from Cloudflare's injected `/cdn-cgi/challenge-platform/scripts/jsd/main.js` and is intermittent (not fixable in code, only by turning off the Cloudflare JS Detections injection). Only `llms-txt` and `ai-catalog.json` remain failing (agentic-browsing 50). ✅ `llms.txt` written 2026-10-29 (`apps/web/public/llms.txt`: H1, summary, links to the stable public pages; [ ] verify `https://carsua.app/llms.txt` is served as the file, not the SPA shell, and the `llms-txt` audit passes after deploy). ✅ ARD manifest written 2026-10-29 (`apps/web/public/.well-known/ard.json` + identical `ai-catalog.json`, the path Lighthouse probes; validated against Lighthouse's bundled schema) pointing at a curated public OpenAPI document `/.well-known/openapi.json` (`apps/api/src/openapi/public-doc.ts`, allowlist `PUBLIC_API_PATH_PREFIXES` = `/api/stats*`, `/api/wanted/stats`; Swagger UI stays off). ✅ Verified after deploy 2026-10-29: `llms.txt`, `ard.json`, `ai-catalog.json` and `openapi.json` all 200 with the right content type (no SPA shell), the openapi doc lists only `/api/stats*` + `/api/wanted/stats` (4 schemas, no tags), `/api/docs` stays the SPA shell; mobile Lighthouse on `/about`: agentic-browsing **98** (was 50), `llms-txt` passes, `ard-schema` valid. The remaining 0.9 is a Low note that `application/vnd.oai.openapi+json` is not one of Lighthouse's "standard discovery types" (left as is: it is the correct media type for an OpenAPI document).
  2. [x] Language chunk preload (2026-10-28): `preloadHints()` in `vite.config.ts` injects an inline script into `index.html` that `modulepreload`s the visitor's language chunk (+ `ua` fallback) using the hashed names; its language pick mirrors `initialLang()` in `src/i18n/index.ts` - keep them in step. Re-measure after deploy.
  3. [x] Brotli (2026-10-28): measured, browsers got **gzip** because Cloudflare passes a compressed origin response through. `infra/Caddyfile` now compresses only non-Cloudflare requests (`@direct`), so Cloudflare compresses to Brotli. ✅ Verified 2026-10-29: `content-encoding: br` on `/assets/*.js`.
  4. [x] Short-TTL cache for the global rollups (`/api/stats/*` except `version`, `/api/fuel/stats|powertrains`, `/api/safety/stats`, `/api/wanted/stats`): `Cache-Control: public, max-age=300` (`common/cache.ts`, 2026-10-28). ✅ Cloudflare Cache Rule "Cache API rollups" created and verified 2026-10-29 (MISS then HIT on all five rollups, `/api/stats/version` stays DYNAMIC). ✅ vdb / rdw / wiki lookups send `Cache-Control` (`LOOKUP_CACHE` browser 1 h + edge 1 day, recalls 15 min / 1 h, `no-store` on `refresh=true`; 2026-10-29, `common/cache.ts`). ✅ Cloudflare Cache Rule "Cache model lookups" created and verified 2026-10-29 (MISS then HIT on vdb, vdb/stats, rdw, rdw/recalls, wiki, wiki/image; `refresh=true` DYNAMIC). The bare `/api/stats` was missing from "Cache API rollups" (prefix `/api/stats/`) and was added, MISS then HIT. Original note: a Cloudflare Cache Rule ("Eligible for cache", respect origin TTL, path `/api/stats*` etc.; Cloudflare does not cache JSON by default) and vdb / rdw / wiki lookups.
  5. [x] Entry graph trimmed (2026-10-28): `ResultCard` is now `lazy()` in `SearchRoute` (like `VinResult`), which was what pulled the whole result-card graph (specs, wiki, maps, auction, model360 helpers…) into the first load. Static graph from `index.html`: 100 modules / 349 kB gz → 58 modules / 260 kB gz; what is left is mostly vendors (react 79, index 49, query 33, schemas 26). Trade-off: a first plate search fetches the `ResultCard` chunk after the data arrives (could be prefetched on idle).
  6. [x] Hero: the same hook adds `<link rel=preload as=image type=image/avif fetchpriority=high>` for the first background photo (2026-10-28). Measured LCP element is a text badge, not the hero, so the gain is mainly paint of the background; wasted if the visitor turned the background off. ✅ Fonts checked 2026-10-29: no `@font-face`, no font requests (system fonts). ✅ `ResultCard` chunk is prefetched on idle from the home page (`SearchRoute.tsx`, `loadResultCard`), so the first plate search needs no extra round trip.
  7. [x] PostHog (and the recorder / surveys / dead-clicks / web-vitals scripts it loads) now starts on first interaction or browser idle (max 4 s); early `capture()` calls are queued (`lib/telemetry.ts`, 2026-10-28). Sentry still starts at once. Re-measure after deploy.
- HTTP/2 + HTTP/3 + Brotli + caching setup: [docs/deploy.md](docs/deploy.md) (open UDP 443!)
- Prod `docker-compose`: Caddy (auto-TLS + **coarse per-IP rate limit**, see
  below) · Redis (RIA + VIN cache, throttler store) · api · web · ingest-cron
- ✅ Deploy tooling written 2026-10-15 (api/alpr Dockerfiles, `infra/docker-compose.prod.yml` + Caddyfile + maintenance page, blue/green api deploy,
  web symlink releases, 3 path-filtered GitHub workflows, bootstrap + backup scripts, web maintenance banner) — ✅ **first real VPS deploy done 2026-10-27** (`docs/plan-done.md` "First VPS deploy"); ✅ R2 backups (nightly + full, restore-tested), SSH hardening and Turnstile done the same day; ✅ UptimeRobot on `/healthz` and ✅ Cloudflare settings + WAF rate-limit rule (2026-10-28); ✅ security gate (mostly), browser smoke test, Contabo snapshot and Telegram preview refresh (2026-10-28); what is left (account-deletion test, CSP enforce, Dependabot): [docs/deploy.md](docs/deploy.md) "Still open".
  Runbook, secrets list and what is still open: [docs/deploy.md](docs/deploy.md). ✅ Ingest cron live 2026-10-28 (`docs/plan-done.md` "Ingest cron"); still open: healthchecks.io checks + `HC_PING_*` secrets, Redis throttler store.
- ✅ CKAN plate ingest cron on the VPS, Tue + Fri (done 2026-10-28; no-op unless CKAN has something new, then backfill + stats + backups; SCHEDULE.md)
- ✅ OG image endpoint — done 2026-10-01 (plate **and** VIN, `resvg-js` + bundled Noto Sans, never
  Puppeteer; see `docs/plan-done.md` "Link previews"). Still for deploy: set `PUBLIC_SITE_URL` to the real
  domain, make sure `fonts/` + `logos/` ship in `WEB_DIST_DIR`, and put a CDN/Caddy cache in front of `/og/`
- Telemetry switched on for real (env flags + keys)
- Full-history ingest of all 16 CKAN resources

### Bot protection, sitemap & SEO (2026-10-12)

✅ **Built in code:** `/sitemap.xml` + generated `/robots.txt` (`apps/api/src/spa/seo.controller.ts`, from `PUBLIC_SITE_URL`; lists
every `STATIC_PAGES` route except `/history`, `/favorites`; plate/VIN pages stay `noindex`) · global `@nestjs/throttler` guard on
`/api/*` only (`common/throttle.ts`: 30/1s, 150/60s, 1500/1h per IP; `/api/plate/*` 100/60s, `/api/vin/*` 30/60s; `/api/auth/me`
skipped; recognize/auth/og keep their own tighter limits) · `TRUST_PROXY` env (`trustProxy` for the real client IP) · baseline
headers (`nosniff`, `referrer-policy`, `x-frame-options`) · 60 s `requestTimeout`.

⚠️ Per-IP only. Not done: tracker keyed on `userId` when authed (needs a session lookup per request), Redis throttler store (the
in-memory store resets on restart and isn't shared across instances), body-email limit on login (P5).

### Deploy-time security checklist (do when setting up the VPS)

Code-level audit findings and the full pre-deploy gate: [docs/security-checklist.md](docs/security-checklist.md) (2026-10-13).

- [ ] Set `TRUST_PROXY=true` **only** once Caddy/Cloudflare is in front and the API port is not publicly reachable; otherwise
      `X-Forwarded-For` is spoofable and the per-IP limits are bypassable (or all users share the proxy's IP).
- [ ] Firewall: expose only 80/443 (+ UDP 443 for HTTP/3); API, Postgres and Redis ports closed to the internet; SSH key-only (✅ verified 2026-10-27), fail2ban.
- [ ] Caddy edge limits from "Rate-limit policy" below (all paths 120/60s; `/api/*` 60/60s + 1000/1h; `/og/*` 300/60s).
- [x] Cloudflare (free tier) in front: ✅ Bot Fight Mode, WAF rate-limit rule on `/api/plate*` and `/api/vin*` (30/10 s per IP), HTTP/3, Always Use HTTPS (2026-10-28,
      `docs/deploy.md` step 4). "Under Attack" stays a manual incident toggle. Trust only Cloudflare's IP ranges / `CF-Connecting-IP` (Caddyfile; re-check the ranges occasionally).
- [x] Cloudflare Turnstile on sign-in "send code" — keys set in production (2026-10-27). [ ] Still open: feedback/discuss submit and (optionally) camera recognize — never on plain search.
- [ ] Headers at Caddy: `Strict-Transport-Security`, a Content-Security-Policy (allow YouTube, Sketchfab, Google Maps, PostHog,
      Sentry, Google Identity; start in `Report-Only`), `Permissions-Policy` (camera/geolocation for self only).
- [ ] Redis-backed throttler storage (shared counters, survives restarts); global daily counter for paid third-party keys
      (Plate Recognizer budget is already capped; add the same for any future RIA key).
- [ ] Swagger (`ENABLE_SWAGGER`) off in production; `/api/admin/*` reachable only for admin sessions (consider IP-allowlisting at Caddy).
- [ ] Secrets only in server env / secret store; rotate the Google client, PostHog personal key and Plate Recognizer token if ever exposed.
- [ ] `robots.txt`/sitemap: verify `PUBLIC_SITE_URL` is the real origin, submit `sitemap.xml` in Google Search Console and Bing Webmaster.
- [ ] Cookie/consent and licence decisions before ads or telemetry go live: [docs/legal-and-monetization.md](docs/legal-and-monetization.md).
- [ ] Uptime monitor on `/healthz`, Sentry alerts on 429 spikes, log retention/rotation.

### Backup policy (Phase 4)

The DB is fully derived and read-only — every row rebuildable by re-running
`ingest.ts`. Recovery is _re-ingest_, not _restore_.

- **Primary:** archive each downloaded source ZIP to R2/B2 at ingest time (~1.2
  GB now, +~110 MB/year). data.gov.ua replaces the current-year resource in
  place — this is the only guard against the portal altering/removing data.
  Already needed once in Phase 1 (see "2026 plate removal" above), so
  `ingest.ts --archive <dir>` exists from Phase 1 on, writing to a local dir
  until this graduates to R2/B2 here.
- **Secondary:** `pg_dump -Fc` once after each successful monthly ingest, keep 2-3.
- **No nightly job.**
- ⚠️ **The first user-writable table (Phase 5) flips this to nightly `pg_dump
--schema=app` + WAL archiving / PITR immediately.**

### Rate-limit policy (Phase 4/5, starting points — tune from PostHog)

Threat: a scraper enumerating plates to dump the registry; login brute-force;
blowing the rate-limited RIA key.

**Edge — Caddy `rate_limit`, per IP, `429` + `Retry-After`:** all paths 120/60s;
`/api/*` 60/60s **and** 1000/1h; `/og/*` 300/60s.

**App — `@nestjs/throttler`, tracker keyed on `userId` when authed:** global
`short` 10/1s, `medium` 60/60s, `long` 600/1h; `/api/plate/:plate` 100/60s;
`/api/vin/:vin` 30/60s; `/healthz` + `/api/auth/me` skip; `/og/*` skip (Caddy
owns it). (P2) `/api/ria/similar` 20/60s per IP **+ a global 5000/day Redis
counter** protecting the shared key. (P5) `/api/auth/login|register` **5/15min
keyed on the body email** + 20/15min per IP.

## Phase 5 — accounts (login + favorites + search history), conditional

Additive to the Nest + Postgres stack; no rewrite.

### Stage A — Google sign-in + paid-feature opt-ins ✅ BUILT (2026-10-06)

Full write-up (flow, DB, API, web, tests) in `docs/plan-done.md` ("Accounts, stage A"). Resume points only:

- **Setup:** Cloud Console → Credentials → OAuth client, type Web → Authorized JavaScript origins `http://localhost:5173`, `http://localhost:3000` (+ the prod domain; redirect URIs are not used) → `GOOGLE_CLIENT_ID` in
  `apps/api/.env`. Unset = the popover says "not configured". Consent screen in Testing mode only admits listed test users.
- **Admin = DB only:** `UPDATE app.users SET role='admin' WHERE email='you@gmail.com';` (the user must have signed in once).
- **Add a paid feature:** extend `PAID_FEATURES` (`packages/shared/src/account.ts`) + `paid.<id>.*` i18n + `PAID_FEATURE_ICON` + `APPLIES_TO` in `PaidFeatureSections`.
- **Since 2026-10-08 the site shows no "paid" wording:** nav/page title say "Features", `AVAILABLE_PAID_FEATURES` is empty, so the opt-in toggles, Save button and result-card placeholder are hidden until a feature is built ("Similar ads on AUTO.RIA" is listed under "Under consideration").
- **⚠ Route clash:** `/features` is the feature-toggle page today, but [FEATURES_PLAN.md](FEATURES_PLAN.md) (planned, not started) wants `/features` for the **feature guide** (+ `/features/changelog`). Decide
  before building the guide: rename the toggles to e.g. `/plan` or `/account/features` (cheap now — it is only `App.tsx`, the sidebar/menu links, `ROUTE_TITLE_KEYS`, the two redirects' source files and the `nav.features` string) or
  rename the guide. The guide also wants a header bell next to the layers/login buttons — mind the right-hand header order (layers · login).
- Flip the backup policy to nightly `pg_dump --schema=app` the day this ships to prod.

### Stage B — what to unlock behind the opt-ins (research, 2026-10-06)

Ship each as its own small slice, cheapest/most-certain first, each gated by its `PAID_FEATURES` flag and allow-listed to
specific users (admin + testers) before opening up:

1. **RIA average price** (`ria_avg_price`) — `developers.ria.com` `average_price` endpoint (same key as Phase 2). Needs the
   brand/model/year→RIA id matrices (Phase 2 `ria_marks` table). Cache per (make, model, year) for 24 h — the average barely moves.
2. **RIA similar ads** (`ria_ads`) — Phase 2 `GET /api/ria/similar`; per-user throttle + global daily counter on the shared key.
3. **Platesmania** (`platesmania`) — only if a token is affordable (~5000 RUB/month and rising with requests per the owner);
   cache by plate aggressively, since per-request pricing makes repeats the cost driver.
4. **Foreign auction history by VIN** (`auction_history`) — no official API exists; resellers (e.g. auction-api.app quote:
   history API $100/mo for 30k requests … $450/mo for 500k; VIN decoder $0.75 full; window sticker $6) front scraped
   Copart/IAAI data. Treat as **unverified-source risk**: get a trial key, spot-check 20 known VINs against the
   `bid.cars`/Copart pages before buying, keep the provider behind an interface so it can be swapped, never block the
   free result on it.

**Pricing model (recommendation):** monthly subscription with one bundle, not per-feature billing and not pay-once.
Costs are recurring per-request fees, so one-off payment loses money on heavy users; weekly adds churn/support for no
gain. Concretely: free tier = today's app; **Plus** (monthly, UAH, via monobank/WayForPay recurring) = RIA price + ads
(cheap, shared key); **Pro** = adds auction history with a monthly VIN quota (the only feature with hard marginal cost).
Keep the checkbox UI for _opt-in/consent_, but let the plan decide what is allowed server-side (`user_features` becomes
"requested", plus an `entitlements` check). WayForPay ~2.0% / LiqPay ~2.75% / monobank recurring all support tokenised
card-on-file subscriptions; revisit with real quotes.

### Stage C — AUTH backlog (deliberately skipped in Stage A, in rough order)

- **Cloud sync** of favorites + search history — ✅ built (2026-10-07, `app.user_saved_entries`, migration 0035; see
  `docs/plan-done.md` "Accounts, stage A+"). Other Google-login perks: per-user saved vehicles with notes, plate watch
  alerts (re-check on ingest, notify by email), export of all personal data, "my lookups" analytics.
- **Favorite labels — built** (no longer "coming soon"): ≤ 10 labels per user in `userSettings.labels` (managed on
  `/settings` → Labels, colors auto-assigned from the `--label-N` HDR palette), label ids on each favorite
  (`app.user_saved_entries.tags`, migration 0037), tagged from the result card / favorites list. Still open: filter chips on
  `/favorites`; unique (case-insensitive) label names; a server-side cap on `labels` beyond the Zod `.max(10)`.
- **Background settings** — ✅ built (2026-10-07: `/settings`, `app.user_settings`, migration 0036; ≤ 5 presets, default
  layer, saved streams). Original brief: per-user control of the page background — which layers are on (live layer
  vs. photos) and photo adjustments (brightness, blur, …). Today's background mode lives in Zustand/localStorage
  (`background-store.ts`, `live-background-store.ts`, `BackgroundDevPanel`): build the UI against those stores first (works
  signed out), then sync the chosen values to `app.user_settings (user_id, jsonb)` so they follow the account.
- **Profile page `/profile`** (the menu then shrinks to name · Paid features · Profile · Sign out; account deletion
  moves here, out of the dropdown). Sections: **Identity** (avatar/name/email from Google, read-only; role; member
  since) · **Sign-in methods** (Google linked; later "set a password" / change password / link another provider / change
  email) · **Devices** (active sessions with user-agent + last seen, revoke one, "sign out everywhere" — `app.sessions`
  already has the data) · **Plan & paid features** (today's `/features` toggles, later subscription + billing history)
  · **My data** (cloud-sync switches, labels, background settings, **export as JSON**) · **Notifications** (email opt-in for
  plate alerts) · **Danger zone** (delete account). Security-sensitive actions — change email, set/change password,
  link/unlink a provider, delete — need a **recent re-login** ("sudo mode", e.g. sign-in < 10 min old) and live only
  here, never in the dropdown. Deletion today = the confirmation dialog (`DeleteAccountDialog`); on `/profile` add a
  re-auth step (password if the account has one, else a fresh Google sign-in) and a **14–30-day grace period**
  (soft-delete flag, sessions revoked at once, "undo" link by email, hard-delete by a scheduled job).
- ✅ **Email sign-in (passwordless code + link), `/profile`, sudo mode, devices, new-device mail, deletion grace built (2026-10-13)** — conventions in
  `docs/features-reference.md` "Accounts", write-up in `docs/plan-done.md`. Still open: notification opt-out for the new-device mail, filter/notify
  settings on /profile, optional password on top (below), passkeys.
- **Email + password (not planned any more — passwordless chosen):** `credentials` table (argon2id), email confirmation, forgot/reset password (single-use hashed
  tokens, 1 h TTL), change password, session list/revoke, login throttle 5/15 min per email + 20/15 min per IP (see
  rate-limit section). Needs a transactional email provider (Resend/Postmark/Brevo free tiers; Brevo or SES if cost
  matters), SPF/DKIM on the domain, and email templates (ua/ru/en). Prefer Better Auth over hand-rolling this part.
  **Not built yet** (checked 2026-10-13: Google + Telegram sign-in exist; no password/email login). Consider a
  passwordless **email magic link / one-time code** first (no password storage, same mail provider, single-use hashed
  token, 15 min TTL, same throttles) and add the password on top only if wanted.
- ✅ **Telegram login built (2026-10-13)** — see `docs/features-reference.md` "Accounts"; write-up in `docs/plan-done.md`. Still open: "add email" on `/profile` for linking/recovery. Original plan: (best fit for the UA audience, free, no review): Login Widget → `POST /api/auth/telegram`
  verifies the payload (HMAC-SHA256 keyed with SHA256(bot token) over the sorted `data-check-string`, `auth_date` ≤ 1 day
  old). Keys: bot token (from @BotFather, **secret**, env `TELEGRAM_BOT_TOKEN`) + bot username (`TELEGRAM_BOT_USERNAME`,
  public), domain set via `/setdomain` (needs https, so test through a tunnel). Telegram gives **no email** → identity
  `(telegram, <numeric id>)` only; `users.email` is nullable or a placeholder, so decide this before the migration, and
  offer "add email" on `/profile` to enable linking/recovery. Also needs `auth_identities` linking by provider subject
  (never by unverified email).
- ✅ **Header What's-new bell + lazy-panel skeletons (2026-10-27):** unread dot from a localStorage seen-date, latest-5 dropdown linking to `/releases`; skeletons for the bell and layers panels — see `docs/plan-done.md`.
- ✅ **Read guides `/read` (2026-10-16):** hub + "Body types" and "Sizes" articles with live examples, size explorer and plate-card links (`stats_size_models`, migration 0071) — conventions in `docs/features-reference.md` "Read guides"; write-up in `docs/plan-done.md`. ✅ `/read/fleet` (colours/fuel/registration years). ✅ `/read/plates` (anatomy, region codes, region-less series). ✅ `/read/generations` (size growth per generation from RDW year-medians, no migration). ✅ `/read/electric` (EVs by model year/region/model + plug guide; `stats_ev`, migration 0072). ✅ `/read/imports` (imports vs dealer by year, models, VIN build country; `stats_imports`, migration 0073). ✅ `/read/safety` (crash tests, reads `/api/safety/stats`). ✅ `/read/fuel` (fuel mix, CO₂ by band/year/model, reads `/api/fuel/stats`). ✅ `/read/vin` (VIN anatomy, type-a-VIN breakdown, year codes, where to find it; static). ✅ `/read/extremes` (heaviest/lightest + power/size records; reuses the `/stats` panels, no new API). Twelfth: `/read/recalls` (recalls vs common faults; model picker over the existing RDW/NHTSA/CA/MOT endpoints, no new API). ✅ Blog-style guide covers/date/copy-link, card → guide links, mass-schema GVM/TBM/GTM/ATM/GCM relations.
- ✅ **Plates guide: old / special / order sections (2026-10-29):** Soviet-era plate photos, plate types with HSC samples, how to order a custom plate, available-plates check, and a not-found hint for old-style plates — see `docs/features-reference.md` "Read guides".
- ✅ **VIN guide: history, where to find it (photos), old numbers, errors, in-app search (2026-10-29)** — see `docs/features-reference.md` "Read guides".
- ✅ **Plates colours/services/history, fleet colour + fuel facts with law links, imports guide, About sources for the guides (2026-10-29)** — see `docs/features-reference.md` "Read guides" and `docs/plan-done.md` "Day digest 2026-10-29 (second sync)".
- ✅ **Card → guide cross-links (2026-10-16):** `ReadGuideLink` pill with a right arrow at the foot of each card / VIN section, pointing to its /read guide; `GUIDE_META` in `read/links.ts` — see `docs/features-reference.md` "Read guides".
- ✅ **Vehicle origin (2026-10-26):** flags chip + `?section=origin` timeline (brand country, ownership, assembly, Ukraine) from Wikidata + NHTSA WMI, legacy countries by year; curated model plants and stats breakdown deferred — see `docs/plan-done.md`.
- ✅ **Docs/About sync (2026-10-28):** release log + About features for RHD chip, race tilt/offline/mini-map, OPUS translate, US base price; see `docs/plan-done.md`.
- ✅ **Monthly digest mail (2026-10-28):** opt-in on /profile, sent on the 1st for the previous month from the release log (only if it had a `new` item), one-click unsubscribe, admin test send; migration 0078, `DIGEST_ENABLED=true` on prod; first real send 2026-11-01, check it then — see `docs/plan-done.md`.
- ✅ **Racer / flags / verification polish (2026-10-25):** region backdrops, smoke + wreck, 10 km end, flag preview, OTK + licence links, glossary, RIA copy-first modal; About sources MVS HSC + flag-icons — see `docs/plan-done.md`.
- ✅ **About sources (2026-10-14):** 8 auction link-out sites added as logo-less tiles (no logo licence found), Telegram Login logo added — see `docs/plan-done.md`.
- ✅ **Contact page + footer copyright (2026-10-31):** `/contact` (who we are, order an app, Resend-backed form with throttle + Turnstile + honeypot, `CONTACT_TO` secret) and `© year carsua.app` in every footer — see `docs/plan-done.md`.
- **Other providers (researched 2026-10-12, not planned yet):** GitHub (client id + secret, code flow), Microsoft
  (client id, OIDC), Facebook/Meta (app id + secret, needs privacy URL + data-deletion URL + Live app), Apple (Services
  ID + Team ID + Key ID + `.p8`, $99/yr, secret JWT rotates ≤ 6 months — skip unless a store app ships).
- **Account deletion with grace period** + data export (JSON); admin-side: list/search users, revoke sessions, disable
  account, per-user feature allow-list for the paid-pilot.
- **Admin Statistics** — ✅ built (2026-10-07, `app.usage_events`, migration 0038, PostHog HogQL proxy). Open: retention
  purge of `usage_events`, per-day chart.
- **Telemetry:** PostHog `identify()` with the user id once consented.

- **DB:** new `app` schema — `users`, `sessions`, `favorites (user_id, plate,
created_at)`, `search_history (user_id, query, kind, found, created_at)`. Same
  instance; split to its own DB only if user data becomes commercially critical.
- **API:** `AuthModule` (argon2 + httpOnly session cookie; Google OAuth via
  Passport later, matching v1), `FavoritesModule`, `HistoryModule`, session
  `CanActivate` guard, `@nestjs/throttler` on login (account-keyed).
- **Web:** login/register forms, `useSession()` query, protected `/favorites` +
  `/history`, favorite toggle on the result card (v1 had the UI + a 50-item cap).
  Auth is server state, not Zustand.
- **Knock-ons:** backup policy flips (above); PostHog `identify()` becomes real
  (drop anonymous-only); EU cookie-consent surface; account deletion + data export.
- **Cheaper interim:** recent searches in `localStorage` (no account), like v1.

## Later, conditional

SSR for `/:plate` only if organic search traffic matters · region as a real
indexed column if region filtering is needed · Drizzle v1 upgrade per the
trigger above · NestJS 12 bump when `nestjs-zod` supports it · TypeScript 7 when
`typescript-eslint` supports it · self-hosted GlitchTip if Sentry's free tier is outgrown.
