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
| ORM       | Drizzle 0.45.2 (pinned)                                                                             | **not 1.0.0-rc** — kit/zod satellites still on 0.4x. Revisit when npm `latest` is 1.x.                   |
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

| Package                   | `latest` (2026-09)                                                | We use                                         | Why held back                                                                                                                                                                                                                                                                                                | Revisit when                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **typescript**            | `7.0.2`                                                           | `~5.9.3`                                       | `typescript-eslint@8.70` peer-requires `typescript >=4.8.4 <6.1.0`. TS 7 (and even 6.1) breaks **all** type-aware linting (`no-floating-promises`, the parser itself).                                                                                                                                       | `typescript-eslint` declares TS 7 support (watch its peerDeps / release notes).                                                                                         |
| **@nestjs/core** & co.    | `12.0.1`                                                          | `^11.2.3`                                      | `nestjs-zod@5.5.0` (latest, nothing newer) peer-requires `@nestjs/common ^10 \|\| ^11` and `@nestjs/swagger ^7 \|\| ^8 \|\| ^11` — no Nest 12. `nestjs-zod` is core to the design (one Zod schema → validation pipe **and** OpenAPI).                                                                        | `nestjs-zod` ships a release listing `@nestjs/* ^12` in peerDeps. Then bump all `@nestjs/*` together.                                                                   |
| **drizzle-orm**           | `0.45.2` is the `latest` **tag**; `1.0.0-rc.4` is on the `rc` tag | `0.45.2` (exact)                               | We're on the actual latest **stable**. Not the RC: the maintainers haven't promoted v1 to `latest` (their own signal); `drizzle-kit` + `drizzle-zod` still target 0.4x; the v1 stream ran 23 betas + ≥5 RCs and still iterates. v1's headline features (RQB v2, RLS, generated columns) are irrelevant here. | npm `latest` points at `1.x` **and** `drizzle-kit` + `drizzle-zod` have stable v1 releases. Then follow `/docs/upgrade-v1`; our Drizzle surface is tiny.                |
| **vitest**                | `5.0.0`                                                           | `^4.1.11`                                      | 5.0.0 shipped as a same-window `.0`. 4.1.11 is mature and already supports Vite 8 (`vite: ^6 \|\| ^7 \|\| ^8` peer) and Node 24. Same "stable over shiny" call as Node 24-not-26.                                                                                                                            | 5.x has a few patch releases and the plugin ecosystem (coverage, ui) has caught up. Low urgency.                                                                        |
| **node**                  | `26.8.2` (Current)                                                | `24.x` (`24.21.0` is the newest LTS "Krypton") | 26 only becomes LTS in Oct 2026; "entering LTS" ≠ ecosystem-ready — native deps and CI images take months. Conservative for an unattended VPS. Upgrading is a one-line `.nvmrc` / Dockerfile change.                                                                                                         | 26 has been LTS for a few months and `node:26-alpine` is everywhere.                                                                                                    |
| **@tanstack/react-table** | `9.2.4`                                                           | `^8.21.3`                                      | v9 (added 2026-09, Phase 1.5 stats table) is a ground-up rewrite — feature-based internals, no top-level `useReactTable`/`getCoreRowModel`/`getSortedRowModel` (moved under `./legacy`). v8's headless sort/filter API is the one this codebase's usage is built against and is well-established.            | v9's docs/ecosystem (examples, Stack Overflow, this model's training data) catch up to the new API — re-verify against its actual docs before bumping, not from memory. |

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

Everything else (React 19.3, React Router 8.3, Vite 8.2, Tailwind 4.3, TanStack
Query 5, Zustand 5, i18next 26, `@sentry/*` 10, `posthog-js`, `drizzle-kit`
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

**Real-photo pass (2026-09-30 / 10-01) — 88 own Ukrainian photos** (kept in a
gitignored `services/alpr/eval/images/`; `services/alpr/eval.mjs` runs them
through the container and writes `eval/results.json`, scoring recall once an
`eval/labels.csv` (`file,plate|plate`) exists — **no labels yet, so no recall
figure**). Findings and fixes:

- **EXIF orientation was ignored** (the biggest miss): phone portrait shots are
  stored sideways with an EXIF flag, so plates reached the detector rotated 90°.
  `app.py` now applies `ImageOps.exif_transpose`. Every previously-empty phone
  photo then read correctly. (The web flow hid this: the canvas downscale drops
  EXIF; a direct upload did not.)
- **Truncated reads.** The detector box is tight/cut on angled plates
  ("BC15"): `app.py` now OCRs a padded crop and retries with wider padding when
  the read isn't 8 chars. A box touching an _inner tile edge_ is a plate cut by
  a seam ("388CX" beat "BE8388CX" in the merge) — such boxes are skipped and
  full-length reads win the duplicate merge.
- **Candidate filter.** `isUaPlate` (`packages/shared/src/plate.ts`) keeps only
  complete plates in shapes verified against the registry (16.7M rows):
  `LLDDDDLL` ~91% — besides the 12 Cyrillic look-alike letters it uses Latin
  Y/Z/J/F/D/G/… (~6% of rows; all electric-car series, e.g. `ВС1554ZА`) — and
  the legacy `DDLLDDDD` ~8% (region digits first; registry dates from 2013, so
  re-registered old plates). Signs ("HOTEL"), foreign plates and partial reads
  no longer appear as boxes or in "Also found". `repairOcrPlate` is now
  shape-aware, repairing by slot (0/O, 1/I, 8/B, 2/Z, 5/S).
  Known cost: the legacy shape lets an occasional junk read through (`98II1166`
  on a small object) — require a higher score for it if it gets annoying.
  Not matched on purpose: 6 digits, 4 letters + 4 digits, diplomatic, …
- **Photo EXIF in the UI.** `lib/photo-meta.ts` reads capture date + GPS from
  the original file (`exifr`, before the downscale); `PhotoMetaInfo` shows them
  (GPS links to OpenStreetMap), warns when the photo is ≥1 year old (plate may
  now be on another car) and when it predates 2013 (registry data starts
  2013-01-02 — e.g. `АТ9998АХ` is read right but legitimately absent). None of
  the 88 photos carries GPS (stripped/disabled), so that line is untested on
  real data. Zoom dialog: 🏷 button / `B` hides the plate labels.
- **Two-row / stacked car plates — fixed 2026-10-01.** The registry has ~119k
  4-letter + 4-digit plates (`KA EO` over `3881`, stored `KAEO3881`); the
  whole-plate OCR reads them in an unstable order. `app.py` `_read_stacked`: a box
  with width/height < 2.4 is split into two overlapping rows, each OCR'd (each must
  read exactly 4 chars), joined top+bottom; otherwise the normal read.
  `LLLLDDDD` added to `PLATE_SHAPES`/`isUaPlate`/`repairOcrPlate`. Verified on
  `ua_kaeo3881.jpg`, `images.jpg`, the EV and Passat stacked plates.
  **Tried and rejected:** reordering LLDDDDLL→LLLLDDDD from box aspect alone —
  angled single-row plates also have aspect 1.3-2.4 and it scrambled ~25 correct reads.
- **Motorcycle (3-row) plates — partly fixed 2026-10-01.** Row-by-row OCR does not
  work (this OCR model returns nothing for a lone short row like `AI`), so
  they go through the whole-plate read, which keeps their order but misreads
  small soft plates (`ua_ai1920ja.jpg`: `AL1930JA`, truth `AI1920JA`). Fix in
  `_read_plate`: when no plain read reaches 0.97 (0.9 was too low: the web's q0.85 JPEG re-encode turned the plain read into `AL1930JA` at 0.94 and the retry never ran), retry on a tight crop upscaled 2x
  and sharpened → `AI1920JA` 0.98. Padding hurt that plate (wider crops read
  `AI1930JA`/`AU1533JA`). Cost: ~+13% latency (414→469 ms/photo avg). The
  sharpened retry also changed 8 other reads among the 88 photos; on the one checked
  by eye (`20241103_135726.jpg`) it was better (`BC3847EI`), but with no
  `labels.csv` there is still no recall number.
- **Legacy-shape junk — fixed 2026-10-01.** `recognize.mapper.ts` drops a
  digits-first (`DDLLDDDD`) read scoring < 0.7 (`LEGACY_MIN_SCORE`).
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

### VIN image recognition (camera/upload) — researched, planned (2026-10-03), not started

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
chassis VINs (low-contrast embossed metal, hard even for specialist OCR); fine-tuning
a VIN model until there are thousands of labelled photos.

### Phase 3+ — recalls — **researched, parked (2026-09-24)**

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

### Actual — ready or in progress

- ✅ Local search history in IndexedDB, grouped/collapsible by month/year,
  per-record delete + clear-all — done, see Phase 1.5.
- ✅ Add/remove favorites in IndexedDB — done, see Phase 1.5.
- ✅ Find plate by camera/photo (Plate Recognizer Snapshot API) — done, see
  "Plate image recognition" under Phase 3.
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
- ✅ Registry statistics page, step A (table) and step B (map) — both done,
  see Phase 1.5.
- ✅ Manufacturer/brand breakdown + year filter on the stats page — done, see
  Phase 1.5.
- ✅ Vehicle-kind icon (animated, colored by registry color) + brand logo on
  the result card — done, see Phase 1.5.
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

- 📋 **Wanted (stolen) vehicles** — planned 2026-10-01, researched, not started.
  See "Wanted vehicles ingest" below.

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
  transport for Львів only; (b) YouTube ISS streams can be retired or embed-blocked — swap ids in `EARTH_STREAMS`.

### Wanted vehicles ingest — planned (2026-10-01), not started

Source: data.gov.ua dataset `ac1a3a9d-512b-446b-9b0c-1383d38ce474` (National
Police, CC-BY, "more than once daily"). Resource `CarsWanted.json`
(`2d69d196-02f1-49b9-97fa-0fb69077e05f`), ~36 MB, one JSON array replaced in
place. Fields (all required): `id`, `brand`, `model`, `cartype`, `color`,
`vehiclenumber`, `bodynumber`, `chassisnumber`, `enginenumber`,
`illegalseizuredate`, `organunit`, `insertdate`. No status / found-date field.
Record count unverified (~80-100k estimated) — check on first download.

**Key finding:** the file is a full snapshot of the _current_ list, so a found
car most likely just disappears from the next file. CKAN revision history is
patchy (see registry data). We must keep our own history → tombstones, never
hard-delete.

Design:

- Table `registry.wanted_vehicles`: `source_id` PK, normalized `plate`, `vin`
  (from `bodynumber`/`chassisnumber`, validated), brand/model/color/cartype/
  organunit, `seized_at`, `inserted_at`, `raw jsonb`, `first_seen_at`,
  `last_seen_at` (or a `sync_run_id` to avoid rewriting every row daily),
  `resolved_at` (null while listed). Indexes: plate, vin, resolved_at.
  Separate table joined at query time — not a column on the registry.
- `scripts/src/wanted.ts` (same style as `ingest.ts`): `package_show` → compare
  resource `last_modified` with the stored value, exit if unchanged → stream
  download + stream-parse (`stream-json`, not whole-file `JSON.parse`) with Zod
  per row → staging table → one set-based upsert → mark rows missing from the
  run `resolved_at = now()`.
- **Safety guard:** abort without resolving anything if the file fails to parse
  or has < ~80% of the previous row count (truncated download must not mass-
  "recover" cars).
- Match by plate, and by VIN for plateless cars (2026 plate removal). Police
  free-text fields are likely messy — normalize with `normalizePlate`, validate
  VIN, measure the match rate on real data first.
- Schedule: daily is enough; the `last_modified` check makes a 2-6 h cadence
  nearly free. Add to `ingest:all`.
- UI: label as "listed as wanted as of <date>", not a flat claim (stale for
  hours, found cars may linger).

Load estimate (unmeasured): ~36 MB download (~5-8 MB gzipped) per changed run,
tens of MB RAM when streamed, seconds to low tens of seconds of DB work for
~100k narrow rows, sub-ms indexed lookups. No meaningful VPS impact.

First steps when picked up: download the real file locally, confirm count and
plate/VIN quality, then migration + Zod schema in `packages/shared` + `wanted.ts`
with a fixture test.

### Wikimedia hero-image cache in Postgres + pre-warm — built (2026-10-05), start tier (≥1000 cars) pre-warmed

**Status.** Built: migration `0030_wiki_image`, DB-backed `WikiService` with retry/backoff and the never-cache-errors
rule, `scripts/src/wiki-images.ts` (+ `failed.json`, `--retry-failed`, `--retry-not-found`, CSV,
`wiki-images:coverage`). **Runbook steps 1-4 are done (2026-10-05)** on the ≥1000-car tier (1,385 models): 1,014 models
with a photo / 370 not_found / 1 failed (chrysler gr.voyager, 400 `cirrussearch-too-busy-error`; the retry resolved it as
not_found; no 429s). The lead-image fallback now also tries the brand's home-country Wikipedia, then Ukrainian
(`leadLanguages()` in `packages/shared/src/wikimedia.ts`; `--retry-not-found` re-ran the 370): **+73 models → 1,093
with a photo, 298 not_found** (mostly VAZ/UAZ numeric codes, Chinese codes, spellings like "bmw 118 i" — no article
exists under that name). Table: 26,703 rows (14,281 ok / 12,422 not_found). Coverage: **59.4% of all registered cars have
a photo** (64.6% in the ≥1000 tier; the 100-999 and <100 tiers are not processed yet). Seed CSV re-exported
(`scripts/seed-data/wiki-images.csv.gz`, 652 KB). **Step 5 done (2026-10-05, ≥100-car tier, `--rps 2`, ~2 h, no
429s):** 2,616 more models → 1,739 with a photo / 876 not_found / 1 failed (a VAZ-like "уаз 3741" search timeout; the
`--retry-failed` replay resolved it as not_found). Running totals over both tiers (4,007 models): **2,832 with a photo /
1,175 not_found / 0 failed** (before step 5: 1,093 / 298 / 0 over 1,391). Table: 58,023 rows (25,851 ok / 32,172
not_found); CSV re-exported (1.2 MB). Coverage by registered cars: ≥1000 tier 64.6% photo; 100-999 tier 44.2% photo
(11.4% not_found, 44.5% still shown as "not processed" — unexplained after a full ≥100 run; check the coverage
script's grouping before step 6); <100 tier 0%; **ALL 62.3% of cars have a photo**
(was 59.4%). **Next: step 6 (optional, asks first).** The "stages" 1-3 (title search →
batched imageinfo → lead fallback over several languages) happen _inside every run_, per chunk of 20 models; they are not
separate runs. Ideas not done: search by normalized name for odd spellings ("118 i" → "118i"); non-Latin article titles
(zh/ja/ko) are mostly rejected by the "title mentions the model" guard.

**Runbook — what to execute, in order** (local dev stack: `pnpm db:up`, real registry loaded; run from the repo root)

| #   | Command                                                                      | Covers                                 | Est. time (1 req/s / 2 req/s)               |
| --- | ---------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| 1   | `pnpm ingest:wiki-images`                                                    | start tier: models ≥1000 cars (~1,400) | done (~35 min at 1 req/s)                   |
| 2   | `pnpm wiki-images:coverage`                                                  | check: % of cars with a photo, by tier | seconds (+ ~1 min registry scan)            |
| 3   | `pnpm ingest:wiki-images -- --retry-failed`                                  | replay everything in `failed.json`     | minutes                                     |
| 4   | `pnpm export:wiki-images:csv`, commit `scripts/seed-data/wiki-images.csv.gz` | seed for fresh clones                  | seconds                                     |
| 5   | `pnpm ingest:wiki-images -- --min-cars 100`                                  | next tier: models ≥100 cars (~4,000)   | ~1-1.5 h / ~45 min                          |
| 6   | `pnpm ingest:wiki-images -- --min-cars 1`                                    | everything left (~15.7k models in all) | ~5 h more / ~2.5 h                          |
| 7   | repeat 2-4 (+ `--retry-not-found` after a new language is added)             | re-check, retry failures, re-export    | minutes — **once, after the last tier run** |

Notes for the runs: every run is resumable (done models are skipped) and Ctrl-C stops after the current chunk, so 5-6
can be split into sessions of ~1 h with `--limit 800` or by brand (`--brand kia`). Models stored `failed` are skipped
by normal runs — only `--retry-failed` (add `--all` to ignore the wait) retries them; the list is
`scripts/.data/wiki-images/failed.json`. Use `--rps 2` (the cap) once a first run shows no 429s. Steps 1-4 are enough to
ship; 5-6 are worth it only if the coverage report shows the ≥100 tier is missing many cars (the tail mostly returns
`not_found`, and any lookup caches itself on first open). Cached search responses live in `scripts/.data/wiki-images/`
(gitignored, kept on purpose; `--refresh` ignores them).

Built as designed below, with these differences: `year` is `smallint`, **0 = the model-level row**; `origin` has four
values (`commons_year | commons_nearest | commons_model | lead`) — `commons_model` is the newest-year photo, `lead` is
only used when Commons gave the model nothing; nearest-year borrowing is capped at 4 years; a failed request never
overwrites an `ok` row; Commons rules + request shapes + retry policy are shared in `packages/shared`
(`commonsImage.ts`, `wikimedia.ts`); `source=wiki` (A/B knob) bypasses the table.

#### Original plan (planned 2026-10-03)

Scope: **the hero photo only** (url, size, attribution) — not the Wikipedia text. The extract keeps its live lookup
via `WikiService` for now; if it later needs caching it becomes a separate table/feature (text is language-specific,
the image is not). Goal: the plate/VIN result gets its car photo from our own DB — no Wikimedia call on the hot path,
no 429/5xx surfacing to users.

Why: `WikiService` (`apps/api/src/wiki/wiki.service.ts`) caches in a 300-entry in-memory map, lost on restart. A cold
image lookup is up to 3 Wikimedia calls (Commons year search, article lead image, attribution); any non-OK answer is a
502 with no retry, and 429s happen in practice.

**Decisions**

- Persist **image metadata only** (url, width, height, author, license, license url). Files stay hotlinked from
  `upload.wikimedia.org` at the standard 1280px thumb — **not downloaded/rehosted** (same "media stays linked" rule as
  Euro NCAP; thumbs are CDN-served, the slowness is the API round trips). A self-hosted thumbnail cache is a Phase 4
  (VPS) option, not now.
- **Language-free**: Commons search never depended on `lang`; the lead-image fallback is taken from the English article
  only. One row serves ua/ru/en.
- Scope: passenger cars only (`kind ILIKE '%легков%'`). IMCDb rejected as a source (movie screenshots, studio
  copyright, Cloudflare bot challenge, no API).

**Schema** — migration `registry.wiki_image`

- Key `(brand, model, year)` normalized lowercase; `year` empty for the model-level fallback row (lead image).
- Payload: `image_url`, `image_width`, `image_height`, `attr_author`, `attr_license`, `attr_license_url`, `source`
  (`commons_year | lead`), `title` (Commons file or article, for debugging).
- Status: `status` `ok | not_found | failed`, `last_http_status`, `last_error`, `attempts`, `next_retry_at`, `updated_at`.
- `not_found` = a **200 with no qualifying image** (Wikimedia answers 200, never 404) → TTL ~30 days, then one fresh
  attempt. `failed` = retries exhausted (429/5xx/timeout) or a non-retryable 4xx → never shown as "no photo".

**Service behaviour** (`wiki.service.ts` image path)

- Order: `(brand, model, year)` row → `(brand, model)` lead row → live fetch (writes the row). The in-memory map stays
  as a hot layer in front. A missing image falls back to the per-kind placeholder as today.
- Retry only 429, 5xx, network timeouts; max 3 attempts, exponential backoff + jitter, honor `Retry-After` (cap ~30 s).
  Other 4xx (400/403) fail immediately and are logged (User-Agent / code problem, would not self-heal).
- On final failure: store `failed` (`next_retry_at`: 1 h → 6 h → 1 d; 7 d for non-retryable 4xx), serve a stale `ok`
  row if one exists, else no image (not a 502 — the photo is decoration). Never store an error as `not_found`.
- Check the User-Agent: Wikimedia wants a real contact URL/email; `PUBLIC_SITE_URL` is localhost in dev and may be
  throttled harder.

**Pre-warm script** — `scripts/src/wiki-images.ts`, patterned on `ingest:infocar`

- `pnpm ingest:wiki-images` — top brand/model/year groups from `registry.current_registration`; options `--min-cars N`
  (default 1000), `--limit N`, `--dry-run`, `--refresh`, `--rps` (default 1, max 2). Resumable (skips existing
  `ok`/`not_found` rows), slows and pauses on repeated 429, ends with a summary
  ("ok · not_found · failed 429×N, timeout×N"). Commons year search returns thumbnail + license in one request, so
  attribution costs nothing extra on that path.
- `pnpm ingest:wiki-images -- --retry-failed` — only `failed` rows past `next_retry_at`; `--retry-failed --all`
  ignores the wait.
- **Every failed request is listed, per stage** (like carshow360's `failed.json`): `scripts/.data/wiki-images/failed.json`
  gets one entry per request that ended in 429/5xx/timeout/other 4xx — `{ stage (search|imageinfo|lead), brand, model,
titles[] (stage 2 batch), http_status, error, attempts, at }` — written as it happens, so a killed run keeps the list.
  The end-of-run summary prints the count by status and stage plus the path. `--retry-failed` replays exactly that list
  (a stage-2 batch is retried as its titles, not re-searched); entries that succeed are removed, the rest stay. Gives
  the same picture as the `failed` DB rows but as a plain file you can read, diff and re-run without touching the DB.
- `pnpm ingest:wiki-images:csv` / `pnpm export:wiki-images:csv` — committed gzipped CSV in `seed-data/`, `ok` +
  `not_found` rows only (`failed` is environment noise, stays local). Add to `ingest:ratings:csv` / `ingest:all`;
  update CLAUDE.md commands.
- `pnpm wiki-images:coverage` — rows with/without image by status and tier, plus weighted by cars (share of the 24.7M
  registered cars that get a photo). Replaces ad-hoc SQL.

**Sizing — naive per-year search; superseded by the batching section below** (real registry, 24.7M rows, passenger
cars; measured 2026-10-03; 1 request ≈ 1 row of work)

Requests = one Commons search per brand/model/year group + one English lead-image lookup per model (+ ~1 attribution
lookup per lead image, ~1 in 10 models).

| Tier                                         | Groups / models | Requests | At 1 req/s              |
| -------------------------------------------- | --------------- | -------- | ----------------------- |
| Start: groups ≥1000 cars + models ≥1000 cars | 2,953 / 1,391   | ~5,700   | ~1.6 h                  |
| Groups ≥100 cars + models ≥100 cars          | 14,803 / 4,008  | ~19,200  | ~5.3 h                  |
| Everything                                   | 97,135 / 15,769 | ~129,000 | ~36 h (18 h at 2 req/s) |

Tiers 1-2 are worth running; the long tail is mostly rare/garbled spellings that come back `not_found` — skip it, a
user lookup caches itself on first open. Cap at 2 req/s. Rows are well under 1 KB → a few MB in the DB, ≤1 MB gzipped.

**Batching — probed against the live Commons API (2026-10-03), use this instead of one search per year**

The MediaWiki API cannot batch several _searches_ in one call, but it batches everything after the search:

1. **One search per model, not per year** — `list=search` (`srsearch="Kia Ceed" filetype:bitmap`, `srnamespace=6`,
   `srlimit=500`) returns titles only (cheap). Probe: "Kia Ceed" → 195 hits in one response, no continuation;
   141 titles carry a standalone year (2018×39, 2021×19, 2025×17, 2012×2, 2013×1 …). Pick the year match locally with
   the existing `pickCommonsCandidate` rules. Models with >500 hits need `sroffset` paging or a narrower query.
2. **Batched imageinfo for the chosen files** — `titles=File:A|File:B|…` (up to 50 per request, across any models)
   with `iiprop=url|size|mime|extmetadata&iiurlwidth=1280`. Probe: 50 titles → 50 thumbnails + 50 licenses, one request,
   no warnings. (`generator=search` + `prop=imageinfo` is NOT the way: imageinfo with thumbs is capped per request and
   returns an `iicontinue`.)
3. **Lead-image fallback only where Commons gave nothing** for the model (English `generator=search` + `pageimages`).

Side benefit: with every file title for a model in hand, a missing year can fall back to the **nearest year** (the Ceed
has photos for 2012-2013 but none for 2011/2017) with no extra requests — better than per-year search, which returns
nothing for a gap year. Seen in the probe: Commons spells it `Kia cee'd` / `Ceed` / `Сee'd` — the search normalizes
most variants, but add a few spelling aliases to the pre-warm query builder.

Revised request counts (replace the sizing table above): stage 1 = one per model; stage 2 ≈ chosen files ÷ 50; stage 3
≈ ~30% of models (estimate). Start tier (1,391 models): ~1,900 requests ≈ **~30 min**. 100+ tier (4,008 models):
~5,500 ≈ ~1.5 h. Everything (15,769 models, ≤97,135 groups): ~23,000 ≈ **~6.5 h at 1 req/s** (~3 h at 2 req/s).
The `--min-cars` tiers then matter far less; running everything becomes reasonable.

Unverified idea for the fallback stage: one Wikidata SPARQL query for all car models with an image (`P18`) and Commons
category (`P373`) would replace stage 3 with a single request — but Wikidata labels match registry strings loosely.
Try only if stage 3 turns out to be the slow part.

**Order**

1. Migration + DB-backed image cache in `WikiService` (+ tests: hit, miss, lead fallback, stale-serve, TTL).
2. Retry/backoff/`Retry-After` + never-cache-errors rule (+ tests with a mocked `fetch` returning 429/503/timeout).
3. Pre-warm script, `--retry-failed`, CSV export/import, coverage report, CLAUDE.md command list.
4. Run the start tier in the background, review coverage, then decide on the 100+ tier and the per-model trial.

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
  "search YouTube for this car" link in the Video reviews section (requested 2026-10-05, scope unconfirmed); YouTube Data API enrichment of
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

**Step 2a — infocar video crawl: done 2026-10-04; models with no video → YouTube fallback (to do).** Full crawl:
153 brands, 3,739 videos (`registry.car_videos`, committed as `scripts/seed-data/infocar-videos.csv.gz`, loaded by
`ingest:ratings:csv`). `youtube_id` is the real YouTube id scraped from infocar's `/video/` pages (infocar embeds
YouTube), not an infocar-internal id; thumbnails are infocar-hosted. 83% have a model slug + generation id, but only 42%
of all videos have a generation present in the version catalog (the year filter needs it; 41% fall back to the title
year, 15% have neither). Measured `videoLookup` over the 400 most-registered (brand, model) pairs: 245 have ≥1 video
(74.1% of those registrations); on the top 60, 52 have one, only 41 once the car's year is applied. **No-video models,
by registrations (the to-do list for alternative sources):**

- Ukrainian/Soviet-built, largely outside infocar's coverage: Daewoo Lanos (~230k incl. ЗАЗ/ZAZ-Daewoo spellings), Sens,
  Nexia; ВАЗ 2101/2103/2105-2109/21043/21063/21093/21099/2121/21101/21104/211540/217030/21150/21213; ЗАЗ 110307/1102/
  110557; ГАЗ 3110/3302; Chevrolet Niva.
- Western passenger cars: VW Touran (63k), Ford Fusion (59k), Mitsubishi Lancer (86k), Fiat Doblo (77k), Renault Laguna
  (28k), Opel Omega (38k), Volvo V50, Chery Amulet (34k), Dodge Journey, Hyundai Getz (30k) / ix35, Nissan Note /
  Primera / Tiida, Ford C-Max, Opel Meriva / Movano, Peugeot 307 / 207 / Expert, Fiat Scudo / Ducato, Mercedes Vito,
  Chevrolet Nubira, VW Bora / LT 35, Audi 100 / 80, Mazda CX-7 / 626 / 5, Mitsubishi Colt.
- Commercial/odd registry entries (MAN TGX, DAF XF, Krone SD, ПГ/ПА trailers, Honda Dio, Geely MR-7151A, Musstang):
  skip — not worth video matching.
- Also: old-year gaps (model has videos but none for a 2007–2008 car): Toyota Camry, Hyundai Tucson / Santa Fe /
  Accent, Mazda 3, Nissan Qashqai, Mitsubishi Outlander, VW Caddy, Opel Zafira. Intended (no wrong-generation videos).
- Re-derive/extend the list with the registry query + `videoLookup` (top N pairs, 0 results) — the 400-pair run is
  what the numbers above come from; the registry spells many models twice ("LANOS LANOS"), collapse them first.

**YouTube fallback — trial done 2026-10-04; full build + crawl is the next session's job.** Search YouTube for gap
models only, as an **offline batch** that stores results next to `car_videos` (new `source` column or a sibling table;
links + facts only, same lookup path) — never live per request. Per (brand, model, generation), not per year.

**Build status (2026-10-05): ingest built (steps 3, 4, 6-tooling, 7); real run in progress (day 1 done, see below); lookup integration + UI (step 5 / item 1 / item 4) still to do.**
**Run log:** `pnpm ingest:youtube-videos -- --min-cars 5000`, once per Pacific day (after ~10:00 Kyiv). Day 1 (2026-10-05): 67
models, 443 videos, 9,090 units, 0 errors; obscure ВАЗ trim codes fell through to 3 queries (303 units each), so fewer than the
~89 models/day estimate. Afterwards ВАЗ trim codes were folded into the base model (`baseModel`: 21063 → 2106, 210994 → 21099,
217030 → 2170; day-1 rows re-keyed, their run rows dropped), so the ≥5,000 tier is now 131 models with ~85 left (≈ 1 more
day). **Next:** run the same command tomorrow; when `done` reports nothing left, `pnpm export:youtube-videos:csv` and commit
`scripts/seed-data/youtube-videos.csv.gz`; then the lookup/UI integration, then `--min-cars 1000` (374 models, ≈ 3 more days).
Migration `0031_youtube_videos.sql` (`registry.youtube_videos` + `youtube_model_runs` resume/quota ledger),
`scripts/src/youtube-videos.ts` (+ `youtube-videos-filter.ts`, tested), CSV export/import wired into `ingest:ratings:csv`.
The target list is derived (`--list`): 5,142 passenger-car gap models; tiers by registered cars at ~101 units/model, ~89
models/day: ≥10,000 cars = 99 models ≈ 1.1 d · ≥5,000 = 164 ≈ 1.8 d · ≥2,000 = 299 ≈ 3.4 d · ≥1,000 = 435 ≈ 4.9 d ·
≥100 = 1,334 ≈ 15 d. So "1.5-2 days" buys the ≥5,000 tier (3.17M of the 4.15M gap cars); run `--min-cars 5000` first.
Known gaps: the same model under two brand spellings is searched twice (Daewoo/ЗАЗ LANOS); Cyrillic aliases exist only for
the curated table in `youtube-videos-filter.ts` (others need the Latin model name in the title); no generation matching yet.
Dry-run on 2 models (Lanos, Lancer): 8 kept each, 101 units each.

_Trial_ (`scripts/src/youtube-videos.ts`, now the real ingest; run with
`pnpm --filter @carplates/scripts exec tsx --env-file=../apps/api/.env src/youtube-videos.ts [model…]`): 10 gap models
(Touran, Fusion, Lancer, Doblo, Laguna, Omega, Lanos, ВАЗ 2107, Getz, Note), 3 queries each, 3,010 units total
(≈301/model). `GOOGLE_API_KEY` is valid (HTTP 200). 16–24 kept per model of ~17–27 found; the kept ones are mostly real
reviews (carwow, Carbuyer, What Car?, AcademeG, Зенкевич, ArchiLow, Auto BOSS). Calls used: `search.list`
(`part=id&type=video&videoEmbeddable=true&maxResults=10`) then one `videos.list`
(`part=snippet,contentDetails,status,statistics`) per model, parsed with Zod.

_Languages — priority cascade ua → ru → en (decided 2026-10-04):_ run the ua query first and **stop as soon as ≥3
videos survive the filter**; only then-missing models get the ru query, then en. ua `"<brand> <model> огляд
тест-драйв"`, ru `"<brand> <model> обзор тест-драйв"`, en `"<brand> <model> review"` (brand/model in Latin as in the
registry; for ВАЗ/ЗАЗ/ГАЗ also the Cyrillic + Lada/Zaz spellings), each with `maxResults=50`. Measured on the 10 trial
models: **all 10 stopped after the ua query** (26–48 kept of 50) — 101 units/model instead of ≈301. Caveat: the ua query
mostly returns _Russian-titled_ videos (only ~2 of 10 models had a `lang=ua` title in the top results), so "ua first"
is a search-phrase priority, not a guarantee of Ukrainian-language videos. If a real ua video matters, count the
threshold on `lang=ua` titles instead — that makes most models fall through to ru/en again (≈200–300 units/model);
decide before the full run. Store a `lang` column (`ua|ru|en`), keep the top ~6–8 per model by views with a **cap per
language** (≤3 en; en is lowest priority — the trial's English hits skew to PakWheels/US channels); the UI orders by
the user's `lang` first. Language comes from the title script, not the API (`defaultAudioLanguage` is mostly empty):
`іїєґ` → ua, `ыэёъ` → ru, other Cyrillic is ambiguous (~⅓ of titles) → treat as `ru`.

_Title filter (works, keep):_ require a model alias in the title (Latin + Cyrillic: `touran`/`туран`, `lancer`/`лансер`,
digits for ВАЗ — hand-curated alias table per gap model; `nissan note` needs the brand because `note` is a common
word); drop non-embeddable (the modal player needs it), duration < 150 s, and dealer/used-car listings (regex
`автопідбір|автоподбор|авторинок|під замовлення|з німеччини|продаж|ціни|в наявності|…`). Known false positives of the
dealer regex: honest reviews titled "…з Німеччини" (e.g. Ivan Rybka's Touran) — accept, or drop `з німеччини` from it
and rely on channel signals.

_Still missing (build these):_ (1) **generation/year matching** — the trial keeps a 2003–2010 and a 2018 Touran video
for every Touran; parse a year or generation word (`MK1`, `Mk2`, `B`, `3`, `X`) from the title and map it to a
generation year range via the infocar version catalog (as `videoLookup` already does for infocar videos), else store the
title year and let `videoLookup` filter by it; (2) the **gap-model target list** — derive from the registry, not a
hand-written array: top N (brand, model) pairs where `videoLookup` returns 0 (the throwaway script that produced the
PLAN list; collapse doubled spellings "LANOS LANOS", skip trucks/trailers/odd entries), ordered by registrations;
(3) **persistence** — migration `NNNN_*.sql` + a **new sibling table `registry.youtube_videos`, not an extension of
`car_videos`** (that one has `infocar_video_id` NOT NULL UNIQUE and an infocar page `url`, and its crawl/CSV/refresh are
infocar-specific; YouTube rows need `lang`/`channel`/`views`/`query` and a quota-limited refresh) (`youtube_id` unique, `brand_slug`/`model_slug` as the
registry-side normalized slugs, `lang`, `year`, `generation_id` null, `channel`, `views`, `duration_s`,
`published_at`, `query`, `fetched_at`), upsert by `youtube_id`, a **resumable per-day run** (skip models already done;
stop cleanly when the API returns `quotaExceeded`, 403), `--model`, `--limit`, `--dry-run`, and CSV export/import like
the other ingests (`export:youtube-videos:csv`, `ingest:youtube-videos:csv` into `ingest:ratings:csv`, CLAUDE.md list);
(4) **lookup integration** — `videoLookup` (`packages/shared/src/infocarVideoLookup.ts`) takes these rows as a second
source after the infocar ones (dedupe by `youtube_id`; infocar first), `MAX_VIDEOS` still caps the section, the UI
labels them as YouTube search results rather than infocar picks; (5) tests for the alias/dealer/duration filter and the
language bucketing (pure functions, colocated).

_Quota & time:_ `search.list` = 100 units, `videos.list` = 1 unit per ≤50 ids, daily default 10,000 (resets midnight
Pacific). With the cascade ≈101 units/model (measured: 1,010 units for the 10 trial models) → ~99 models/day: ~80 gap
models (top-400 list, de-duplicated) ≈ 8k units ≈ **under 1 day**; ~150 with the long tail ≈ 15k ≈ **~1.5 days**
(models that fall through to ru/en cost +100 each; budget ~1.5–2 days to be safe). Without the cascade (3 queries
always) it was ≈301/model ≈ 2.5–3 days for 80. Runtime per day is only ~10–15 min — quota is the limit. Levers:
`maxResults=50` costs the same 100 as 10, so one wide query beats several narrow ones; a quota-increase request (free
form, unknown approval time). Build estimate ≈ 3–4 h. Cheaper add-on: trusted channels' uploads via `playlistItems.list` (1 unit/call), matched locally.

_Done when:_ the no-video models in the Step 2a list (Lanos, Touran, Fusion, Lancer, Doblo, Laguna, Omega, ВАЗ 2107…)
show ≥1 video in the UI, the browser check (КА4845ІО RAV4 → 2015–2018 videos; a Lanos / Touran plate → videos) passes,
and the CSV is committed.

**Next-session steps, in order (YouTube fallback):**

1. **Decide the stop rule** (default: ≥3 kept videos of _any_ language after the ua query — ~101 units/model; the
   alternative, ≥1 `lang=ua` title, is ~200–300 units/model). Check `git status`: `scripts/src/youtube-videos.ts` (the
   trial), the videos CSV and the PLAN edits may still be uncommitted.
2. **Target list**: query `registry.current_registration` for the top N (brand, model) pairs (start N≈400) where
   `videoLookup` returns 0 videos; collapse doubled spellings ("LANOS LANOS"), drop trucks/trailers/odd entries, order
   by registrations. Write it out as a reviewable file (brand, model, registrations) and hand-add the Cyrillic aliases
   per model (the trial's `aliases` array is the format); models without an alias fall back to the Latin model name.
3. **Migration + table** `registry.youtube_videos` (next free `NNNN_*.sql`, Drizzle schema in `packages/db`), plus the
   (brand, model) → done/query-count bookkeeping so a run resumes where it stopped.
4. **Turn the trial into the ingest** (`youtube-videos.ts` → real, still dry-run-able): the cascade, filter, language
   bucketing, ≥1 `videos.list` per query, upsert by `youtube_id`, stop cleanly on 403 `quotaExceeded`, `--model`,
   `--limit`, `--dry-run`; pure helpers (alias/dealer/duration filter, `titleLang`) split out with colocated tests.
5. **Generation/year matching** (item 1 above), then **`videoLookup` integration** (item 4) and the UI label.
6. **Run it**: `--limit 10` first, eyeball, then the full list in daily batches (~99 models/day at 10,000 units);
   watch the units counter the script prints.
7. **CSV + wiring**: `export:youtube-videos:csv`, `ingest:youtube-videos:csv` into `ingest:ratings:csv`, root
   `package.json` scripts, the CLAUDE.md command list; commit the seed.
8. **Verify** (the "Done when" checks) and measure again: share of the top-400 pairs with ≥1 video (was 74.1% of
   registrations), share of lookups with a year-matched video.

**Step 2d — Auto news (RSS): planned 2026-10-04, nothing built.** A "News" subsection/toggle that shows recent Ukrainian
auto-news headlines relevant to the car (make+model+year → make+model → make only). Links + facts only (title, ≤300-char
description, image URL, date, url) — never republish article text.
**Feed findings (measured 2026-10-04, all plain HTTP 200, robots allow):**

- `https://eauto.org.ua/rss` is the _how-to_ HTML page; the real feed is `https://eauto.org.ua/rss.xml` (UTF-8, 50 items, uk;
  `?lang=en` exists). Market analytics from Інститут досліджень авторинку (prices, sales, registrations). **No `<category>`**
  — make/model must come from title text. Mostly market-wide, few car-specific items.
- `https://autoua.net/rss/` (UTF-8, ru, 20 items, `autonews.autoua.net` links + `<enclosure>` image). **Has `<category>`
  tags but dirty** (brand names "Toyota"/"Tesla" mixed with `electric.vehicle`, `china`, `США`) — usable as a hint, but
  the title is the primary source. Only latest 20 → needs periodic polling to accumulate.
- infocar.ua page_106 lists the real feeds (windows-1251 — decode with `TextDecoder('windows-1251')`; `<category>` is
  generic "Авто"/body-type, **not** a brand): `news.infocar.ua/rss/news.php` (**100 items**, uk), `/rss/new-models.php`
  (20; title = "Volvo XC40", link host `volvo-xc40.infocar.ua` and `_id7424` = **exact catalog model**, already in
  `infocar_versions` → best match quality), `/rss/articles.php` (50, evergreen history/advice), `/rss/tests.php` (test
  drives), `/rss/video.php`, `/rss/reviews.php` (30 owner reviews, `<category>` = brand, link has `/brand/model/year/`;
  overlaps the existing infocar reviews crawl — skip). `avtobazar.infocar.ua/rss/bazar.php` is classifieds — skip.
- Other candidates to check later (not fetched): autocentre.ua, auto.ria.com/news RSS, avtoradnyk, nv.ua/auto, 24tv auto.

**Agreed strategy (2026-10-04) — supersedes the items below where they differ.** One daily (later every 6 h — infocar
news' 100-item window is only ~2-4 days) job merges all feeds into a single store; plate requests never touch the
sources, they filter the store on demand.

1. **Merge, don't overwrite.** Key by URL, upsert, prune > 180 days. A rolling archive keeps brand-only news available
   after the short feed windows roll over.
2. **Tag once at ingest** (`brandSlug`/`modelSlug`/`year` stored per item); the request is a filter, not a title scan.
3. **Store: table `registry.news_items` preferred** (consistent with `owner_posts`, safe with API and cron on different
   hosts). A gitignored `data/news.json` (temp file + atomic rename, API caches it in memory and reloads on mtime change)
   is acceptable only if both run on the same box. Decide when building.
4. **Fallback tiers, each capped and labelled in the response** (`match: model | brand | general`): brand+model(+year) →
   brand+model → brand only → general latest. General news only fills slots left over, never displaces real brand news.
5. **Response caching:** `Cache-Control: public, max-age=3600`; `/api/news` stays out of the persisted offline cache (or a
   very short maxAge).
6. **Polite fetching:** conditional GET (ETag/If-Modified-Since), identifying User-Agent, a failing feed must not fail the
   run, log items per source and warn on a source returning 0 items (feed broke). windows-1251 decode for infocar.
7. **Display only** title, short summary, image URL, source, date, link out — no article text, images hotlinked lazily.
8. **Run:** manual `pnpm ingest:news` locally; cron on the VPS in Phase 4.
   Build order: parsers + fixtures (per-feed, pure, tested) → tagger + tests on real titles → table/migration + merge/prune
   → `newsLookup` in `packages/shared` + `/api/news` → UI section → measure (step 7 below).

**Original design.** Feeds only hold the latest N items, so news is **polled into a table and accumulated**, not fetched
live per request (same persisted-catalog pattern as `owner_posts`).

1. **Migration `0026_*`** (renumber if topgear lands first) `registry.news_items`: `url` PK, `source` (enum-ish text),
   `title`, `summary` (trimmed, tags stripped), `image_url`, `published_at`, `lang`, `brand_slug` (nullable),
   `model_slug` (nullable), `year_from`/`year_to` (nullable, only when the title names a year/generation), `kind`
   (`news` | `hot`), `fetched_at`. Indexes `(brand_slug, model_slug, published_at desc)`, `(published_at desc)`.
2. **Tagging (`scripts/src/news-tag.ts`, pure + unit-tested on real titles).** Reuse `infocarBrandSlug` (alias table
   already handles Cyrillic/Latin) over title+summary; model = longest catalog model name for that brand found in the
   title (`infocar_versions` slugs; whole-word, case-insensitive, ≥2 chars, ban ambiguous names like "Up"/"X"/"E"); year =
   4-digit 2000-2030 in the title only. Source hints: infocar `new-models` link host/`_idN` gives brand+model directly;
   autoua `<category>` brand if it resolves via `infocarBrandSlug`. Unmatched items keep null brand and still appear in
   the generic "latest news" strip. Windows-1251 + CDATA + `<img>`-in-description handling in the parser.
3. **`scripts/src/news.ts` + `pnpm ingest:news`** (`--source eauto|autoua|infocar-news|infocar-new-models`, `--dry-run`):
   fetch each feed (conditional GET with ETag/Last-Modified if sent, 1 req/s, set UA), upsert by `url` (idempotent).
   Cheap enough to run hourly; later the VPS cron / a Nest `@Cron` job (Phase 4). No CSV seed (ephemeral data) — but add a
   tiny retention rule (drop > 18 months, keep rows with a model match longer).
4. **Hot news.** Define `kind='hot'` at query time, not by a source flag: published ≤ 7 days AND (model match OR
   source = infocar new-models). Avoids inventing an editorial signal; a real "hot" ranking (clicks) is Phase 5.
5. **Lookup `newsLookup(rows, brand, model, year)` in `packages/shared`**: tiers 1) brand+model(+year within generation
   range if the item has one), 2) brand+model, 3) brand only (cap 3 so it doesn't drown tiers 1-2); newest first inside a
   tier, max ~10 total; each item carries `match: 'model' | 'brand'` so the UI can label "about your model" vs "about
   {Make}". Zod response schema; `news[]` on `GET /api/reviews` **or** a new `GET /api/news?brand=&model=&year=` — prefer
   the separate endpoint: news changes hourly while reviews are near-static, and it keeps the persisted offline cache of
   `/api/reviews` from going stale (add `/api/news` to `lib/offline-cache.ts` with a short maxAge or leave online-only).
6. **UI — decision to make when building (investigate in a browser):** (a) a **News** `SourceGroup` inside `ReviewLinks`
   (cheapest, consistent), or (b) its own collapsible `SectionHeader` section under reviews with a **News / Hot** toggle
   (two chips; Hot hidden if empty). Recommendation: (b) — news is time-bound and a different intent from reviews; reuse
   `SectionHeader` + the show-5/"Show N more" pattern; source favicon + date + 2-line clamp; en/ua/ru strings. Feed
   languages are uk/ru — show as-is with a small `UA`/`RU` chip like the DRIVE2 links (no translation).
7. **Measure:** items/day per source, % tagged with a brand / model, and for the top-50 registry (brand, model) pairs how
   many have ≥1 news item in 30/180 days (expect most popular brands yes, most models no → the brand-only tier matters).
8. **Risks / limits:** title-matching false positives (model names that are common words: Polo, Fit, Up, Note, Jazz —
   require brand co-occurrence); ru text for some sources; feeds only keep recent items so a new DB starts empty until
   polled (backfill = none; infocar news `news.infocar.ua` paging could backfill, check robots first); copyright → link
   - short summary only, always link out and attribute the source.

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

### To discuss / research

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

## Phase 4 — VPS / production

### VPS sizing (starting point)

`registry` schema is 13.9 GB (24.7M rows in `registrations`) as of 2026-09,
growing by roughly the ~110 MB/year the backup policy below already assumes
for archived source ZIPs — the DB grows at a similar rate (one monthly ingest
of deltas, not a re-ingest of the full history). Containers to fit: Postgres,
`api`, `web` (served by `api`), Redis, Caddy, and a monthly `ingest-cron` job
that runs occasionally and holds an exclusive lock on `registrations` for
minutes.

| Resource | Spec       | Why                                                                                                                                                                                                               |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CPU      | 4 vCPU     | Normal traffic is light indexed lookups; `ingest-cron` is I/O-bound not CPU-bound, but spare cores keep it from starving API traffic during its run                                                               |
| RAM      | 8 GB       | Only `current_registration` (the hot-path matview) needs to stay resident, not the full 14GB — 8GB covers Postgres `shared_buffers` + OS page cache + Redis + Node without swapping during ingest's index rebuild |
| Disk     | 80 GB NVMe | 14GB DB + WAL + 2-3 `pg_dump -Fc` backups + archived source ZIPs (~1.2GB, +110MB/year) + Docker images/logs, with years of headroom                                                                               |
| Network  | default    | Indexed point-lookups; bandwidth isn't the bottleneck                                                                                                                                                             |

Roughly a Hetzner CPX32 / DigitalOcean 4vCPU-8GB class box. A 2 vCPU / 4GB /
40GB box would also run fine day-to-day and only feel tight during the
monthly ingest — not an architectural commitment, resize later based on
PostHog-observed load.

- Prod `docker-compose`: Caddy (auto-TLS + **coarse per-IP rate limit**, see
  below) · Redis (RIA + VIN cache, throttler store) · api · web · ingest-cron
- GHCR image build + SSH deploy workflow (GitHub Actions, free for public repos)
- Monthly CKAN ingest cron on the VPS (`ingest.ts`, self-checks `ingested_resources`)
- ✅ OG image endpoint — done 2026-10-01 (plate **and** VIN, `resvg-js` + bundled Noto Sans, never
  Puppeteer; see `docs/plan-done.md` "Link previews"). Still for deploy: set `PUBLIC_SITE_URL` to the real
  domain, make sure `fonts/` + `logos/` ship in `WEB_DIST_DIR`, and put a CDN/Caddy cache in front of `/og/`
- Telemetry switched on for real (env flags + keys)
- Full-history ingest of all 16 CKAN resources

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
