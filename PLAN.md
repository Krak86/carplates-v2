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

### Plate image recognition (camera/upload) ✅ DONE (2026-09-22)

v1 idea (camera/upload → platerecognizer.com via a proxy) implemented for
real, ahead of Phases 2/3: `apps/api/src/recognize/` — `POST
/api/recognize/plate/cloud` proxies Plate Recognizer's Snapshot API
(`guides.platerecognizer.com/docs/snapshot/getting-started`) via
`@fastify/multipart`, gated by `plateRecognizerCloudEnabled(env)` (inert
without `PLATE_RECOGNIZER_CLOUD_TOKEN`) and a per-process monthly request
budget (`PLATE_RECOGNIZER_MONTHLY_BUDGET`, resets on the 1st — revisit with
Redis/DB persistence once there's more than one API process). Web:
`CameraCaptureDialog` + `CameraSearchButton` + `PhotoSearchButton`
(`SearchField.tsx`), client-side image shrink (`lib/image.ts`) before upload,
`use-plate-recognition.ts` navigates to the top candidate's plate result on
success. **On-premise SDK ruled out** — same per-lookup licensing as the
cloud API (no cost win) for photos we're already comfortable sending to
Plate Recognizer's cloud; not pursuing it.

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

**Models — researched and verified 2026-09-27 by actually building and
running the container, not assumed from memory.**
[ankandrew/fast-alpr](https://github.com/ankandrew/fast-alpr) (MIT) wraps
[open-image-models](https://github.com/ankandrew/open-image-models) (detector
`yolo-v9-t-384-license-plate-end2end`, MIT) and
[fast-plate-ocr](https://github.com/ankandrew/fast-plate-ocr) (OCR
`cct-xs-v2-global-model`, MIT) — all ONNX Runtime, CPU-only (matches the
Phase 4 VPS's no-GPU sizing, see its "VPS sizing" table). An initial
Ultralytics/AGPL licensing worry (network-copyleft on a self-hosted service)
turned out **moot** — nothing in this chain touches Ultralytics code, it's a
clean MIT stack end to end. Ukraine's plate format (2 letters + 4 digits + 2
letters, only 12 fixed Latin-lookalike letters — `packages/shared/src/plate.ts`)
needs **no Cyrillic OCR and no custom training** for a first cut — a generic
global OCR model reads plain Latin/Roman characters directly into the
existing `repairOcrPlate`/`normalizePlate` pipeline unchanged. **Not yet
verified:** real-world accuracy against actual Ukrainian plate photos — only
tested so far against fast-alpr's own bundled sample image (US-style plate).
Do that before trusting accuracy, and before investing in steps 2-4.

**Step 1 — own-model OCR service, single-shot ✅ DONE (2026-09-27).** Ships
as an automatically-preferred alternative to the Plate Recognizer cloud call,
inside the _existing_ camera/upload flow — validates the model with zero AR
complexity in the same change.

- `services/alpr/` (new top-level dir, deliberately **outside** the pnpm
  workspace — it's Python, not in `pnpm-workspace.yaml`'s globs): `app.py`
  (FastAPI, `POST /recognize` + `GET /healthz`), `requirements.txt`
  (`fast-alpr[onnx]` — `[onnx]` is the CPU extra; `onnx-gpu`/`onnx-openvino`/
  `onnx-directml`/`onnx-qnn` exist if a future deploy target has different
  hardware), `warmup.py` (run once at Docker build time so the ~11 MB of ONNX
  weights bake into the image layer — the running container needs **no
  runtime network access**, matching the "always free, no external
  dependency" goal), `Dockerfile` (`python:3.12-slim` + `libgl1`/
  `libglib2.0-0`, which headless OpenCV needs even for CPU-only inference).
- `infra/docker-compose.alpr.yml` — a separate compose file from
  `docker-compose.yml` (Postgres only), so a dev who just wants the DB isn't
  forced to build the ML image. New root `package.json` scripts:
  `alpr:build` / `alpr:up` / `alpr:down`.
- `apps/api/src/recognize/local-recognize.service.ts` — same contract as
  `cloud-recognize.service.ts` (`recognize(image) => PlateRecognizeResponse`),
  POSTs to `${ALPR_LOCAL_URL}/recognize`, reuses `mapPlateReaderResults`
  unchanged — the Python service's `{results:[{plate,score}]}` response
  shape was deliberately built to match `PlateReaderResponse` exactly, so no
  mapping code needed duplicating. New `POST /api/recognize/plate/local`
  route on the existing `RecognizeController`, throttled looser than cloud
  (30/60s vs. 6/60s — no per-call cost to protect against here). New
  `ALPR_LOCAL_URL` in `env.ts` (optional; unset → 503, same
  inert-unless-configured pattern as `PLATE_RECOGNIZER_CLOUD_TOKEN`/
  `PIXABAY_API_KEY`). **Not added to `apps/api/.env.example`** — that file is
  in Claude's deny-list (unreadable/uneditable this session); add
  `ALPR_LOCAL_URL=http://localhost:8088` there by hand.
- Web: `recognizePlate()` (`apps/web/src/lib/api.ts`) calls only
  `/api/recognize/plate/local`. **Cloud fallback removed (2026-09-30)** — it
  originally fell back to `/cloud` on a 503/network error; now a down
  container just fails the call. The `/cloud` API route is kept but unused by
  the web app. No other web changes — `CameraCaptureDialog.tsx`/
  `use-plate-recognition.ts` are untouched.
- **Verified end-to-end 2026-09-27, for real, not just unit tests:**
  `pnpm alpr:build` was actually run — build log confirms real ONNX weights
  downloaded (`yolo-v9-t-384-license-plate-end2end`,
  `cct-xs-v2-global-model`), not placeholders. The built container was
  started (`pnpm alpr:up`) and hit directly with fast-alpr's own bundled
  sample plate image: `GET /healthz` → `200 {"status":"ok"}`,
  `POST /recognize` → `200 {"results":[{"plate":"5AU5341","score":0.999...}]}`
  — a correct detect+read. `local-recognize.service.test.ts` +
  `local-recognize.service.disabled.test.ts` (mocked fetch, mirroring the
  existing cloud test pair exactly) plus `pnpm type-check`/`pnpm lint` on
  every touched package all pass. **Not exercised:** a full running
  `apps/api` process calling the live container over HTTP end-to-end — the
  unit tests (NestJS-side mapping/error-handling) and the direct container
  test above (Python-side detection/OCR) already cover both halves of the
  chain independently, so this was judged sufficient for step 1; still worth
  doing once picking up step 2 or 3 for real confidence.

**Tiled detection (2026-09-30).** The 384px detector missed small plates in
wide photos (two plates ≈3.5% of frame width → ~13px after letterbox; only one
was read). `services/alpr/app.py` now runs the full frame plus overlapping
fixed-size 640px tiles (25% overlap, capped at 24 tiles by growing the tile;
frames ≥768px only) and merges duplicate boxes by overlap, keeping the most
confident detection. A first fraction-based 2×2 grid was too weak for plates
~1.5% of frame width (parking-lot photos). Web upload cap raised
1600→3200px / 0.9→2.5 MB (`lib/image.ts`; API limit is 4 MB) so tiles keep
real pixels. Exercised against the rebuilt container on the 88-photo eval set
(2026-10-01); `DSC_0098.JPG` still reads both plates.

**Photo viewer + limits hint (2026-09-30).** Uploaded-photo preview is now
`object-contain` (whole image, not a cropped strip) and opens a full-screen
`PhotoZoomDialog` (wheel zoom toward cursor, drag/arrow pan, `+`/`−`/`0`,
double-click, Esc; no pinch gesture yet). `SearchField` shows a
`recognize.photoTips` line (formats, the `MAX_DIMENSION` downscale, what
tends to be missed) and a 413 error key. Plate boxes are drawn on the
thumbnail and viewer (`PhotoPlateBoxes`, hideable in the viewer). **Not yet:**
rotating the photo, pinch-zoom on touch.

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

- ✅ **Background layers** (2026-10-04) — header layers button on plate/VIN result pages only (`isResultPath`), hidden
  offline, session-only (`live-background-store`, reset on every route change). Modes: photos (default) · Google Maps
  embed centred on the plate region's capital (`REGION_CENTERS`, zoom 13; whole-Ukraine view when no region) · NASA ISS
  YouTube live streams (`EARTH_STREAMS`, 480×270 player scaled up = low quality, mini selector). Lazy-loaded
  (`LiveBackground`, `LayersPanel`). Advanced search also embeds an OSM view of the chosen region (`RegionMap`).
  Researched dead ends: **live traffic** — Google/Waze switched it off in Ukraine (Waze works abroad, e.g. Warsaw, but
  only congestion + reports, nothing moves); **moving vehicles** — travic.app, eway, lad.lviv.ua send
  `X-Frame-Options` (not embeddable), city.dozor.tech is empty until a route is picked, citybus.in.ua is an app
  landing page. Open: (a) Lviv publishes free GTFS-Realtime vehicle positions
  (`track.ua-gis.com/gtfs/lviv/vehicle_position`, ~11 s; licence unchecked) — an API proxy + lazy Leaflet map would
  give real moving public transport for Львів only; (b) YouTube streams can be retired or embed-blocked — swap ids in
  `EARTH_STREAMS`.

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

### Wikimedia hero-image cache in Postgres + pre-warm — planned (2026-10-03), not started

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

### Car reviews (text) then YouTube — planned (2026-10-03), step 0 shipped

**Pick-up point for the next session — start the full infocar video crawl.** Steps 1 and 2 are built and
working on test data (6 brands × 2 pages, 119 videos in the local DB): catalog, video ingest, `videos[]` on
`/api/reviews`, generation-aware year filter, collapsible "Video reviews" section with ❓ info and a modal player.
Uncommitted — check `git status`. **Do next, in this order:**

1. `pnpm db:up && pnpm db:migrate` (0023, 0024 — already applied locally), then `pnpm ingest:infocar:videos` — all
   brands, every listing page. infocar has ~15,800 videos site-wide (`/video/all/` = 1,576 pages × 10, measured
   2026-10-03; only brand-tagged car videos are kept), one request per listing page + per video at 1 req/s → expect a
   few hours cold; HTML is cached in `scripts/.data/infocar/`, so an interrupted run resumes without re-fetching
   (re-run the same command). Trial first with `-- --brand toyota` if wanted; run it in the background and watch the
   `[n/153] brand: N video(s)` log lines.
2. `pnpm export:infocar:videos:csv` → commits `scripts/seed-data/infocar-videos.csv.gz`; add
   `pnpm ingest:infocar:videos:csv` to `ingest:ratings:csv` (root `package.json`, like `ingest:infocar:csv`) and to the
   CLAUDE.md command list.
3. Measure (Step 2 item 5): videos per brand, % with a model slug / generation id, % whose generation is in the catalog
   (the year filter only works for those; the rest use the title year), and what the lookup returns for the top
   registry (brand, model) pairs. Then check in a browser: КА4845ІО (Toyota RAV4 2017) should show only 2015-2018
   generation videos; a Skoda Superb / Kia Sportage plate should show videos.
4. Optional: YouTube Data API enrichment (view counts, videos not on `/video/`; `GOOGLE_API_KEY` is in
   `apps/api/.env`, untested) — not needed for matching. Other text sources (avtoporadnyk, driver.top, nv.ua) and
   Step 3 (moto) come after.
5. **Also run the full e-drive owner-posts ingest (`pnpm ingest:edrive`, ~2.5–4 h) — see Step 2b below.** The two
   crawls hit different hosts, so they can run concurrently.

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

*Trial* (`scripts/src/youtube-videos.ts`, dry-run, uncommitted until the build lands; run with
`pnpm --filter @carplates/scripts exec tsx --env-file=../apps/api/.env src/youtube-videos.ts [model…]`): 10 gap models
(Touran, Fusion, Lancer, Doblo, Laguna, Omega, Lanos, ВАЗ 2107, Getz, Note), 3 queries each, 3,010 units total
(≈301/model). `GOOGLE_API_KEY` is valid (HTTP 200). 16–24 kept per model of ~17–27 found; the kept ones are mostly real
reviews (carwow, Carbuyer, What Car?, AcademeG, Зенкевич, ArchiLow, Auto BOSS). Calls used: `search.list`
(`part=id&type=video&videoEmbeddable=true&maxResults=10`) then one `videos.list`
(`part=snippet,contentDetails,status,statistics`) per model, parsed with Zod.

*Languages — priority cascade ua → ru → en (decided 2026-10-04):* run the ua query first and **stop as soon as ≥3
videos survive the filter**; only then-missing models get the ru query, then en. ua `"<brand> <model> огляд
тест-драйв"`, ru `"<brand> <model> обзор тест-драйв"`, en `"<brand> <model> review"` (brand/model in Latin as in the
registry; for ВАЗ/ЗАЗ/ГАЗ also the Cyrillic + Lada/Zaz spellings), each with `maxResults=50`. Measured on the 10 trial
models: **all 10 stopped after the ua query** (26–48 kept of 50) — 101 units/model instead of ≈301. Caveat: the ua query
mostly returns *Russian-titled* videos (only ~2 of 10 models had a `lang=ua` title in the top results), so "ua first"
is a search-phrase priority, not a guarantee of Ukrainian-language videos. If a real ua video matters, count the
threshold on `lang=ua` titles instead — that makes most models fall through to ru/en again (≈200–300 units/model);
decide before the full run. Store a `lang` column (`ua|ru|en`), keep the top ~6–8 per model by views with a **cap per
language** (≤3 en; en is lowest priority — the trial's English hits skew to PakWheels/US channels); the UI orders by
the user's `lang` first. Language comes from the title script, not the API (`defaultAudioLanguage` is mostly empty):
`іїєґ` → ua, `ыэёъ` → ru, other Cyrillic is ambiguous (~⅓ of titles) → treat as `ru`.

*Title filter (works, keep):* require a model alias in the title (Latin + Cyrillic: `touran`/`туран`, `lancer`/`лансер`,
digits for ВАЗ — hand-curated alias table per gap model; `nissan note` needs the brand because `note` is a common
word); drop non-embeddable (the modal player needs it), duration < 150 s, and dealer/used-car listings (regex
`автопідбір|автоподбор|авторинок|під замовлення|з німеччини|продаж|ціни|в наявності|…`). Known false positives of the
dealer regex: honest reviews titled "…з Німеччини" (e.g. Ivan Rybka's Touran) — accept, or drop `з німеччини` from it
and rely on channel signals.

*Still missing (build these):* (1) **generation/year matching** — the trial keeps a 2003–2010 and a 2018 Touran video
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

*Quota & time:* `search.list` = 100 units, `videos.list` = 1 unit per ≤50 ids, daily default 10,000 (resets midnight
Pacific). With the cascade ≈101 units/model (measured: 1,010 units for the 10 trial models) → ~99 models/day: ~80 gap
models (top-400 list, de-duplicated) ≈ 8k units ≈ **under 1 day**; ~150 with the long tail ≈ 15k ≈ **~1.5 days**
(models that fall through to ru/en cost +100 each; budget ~1.5–2 days to be safe). Without the cascade (3 queries
always) it was ≈301/model ≈ 2.5–3 days for 80. Runtime per day is only ~10–15 min — quota is the limit. Levers:
`maxResults=50` costs the same 100 as 10, so one wide query beats several narrow ones; a quota-increase request (free
form, unknown approval time). Build estimate ≈ 3–4 h. Cheaper add-on: trusted channels' uploads via `playlistItems.list` (1 unit/call), matched locally.

*Done when:* the no-video models in the Step 2a list (Lanos, Touran, Fusion, Lancer, Doblo, Laguna, Omega, ВАЗ 2107…)
show ≥1 video in the UI, the browser check (КА4845ІО RAV4 → 2015–2018 videos; a Lanos / Touran plate → videos) passes,
and the CSV is committed.

**Next-session steps, in order (YouTube fallback):**
1. **Decide the stop rule** (default: ≥3 kept videos of *any* language after the ua query — ~101 units/model; the
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

**Step 2b — e-drive owner posts (e-drive.com.ua): built 2026-10-03; full crawl not run yet.** A car-owner social
network (user logbook posts: repairs, service, accessories — not editorial reviews), shown as the "e-drive.com.ua"
subsection of the text reviews toggle (`ReviewLinks`: infocar.ua = test drives + owner reviews, e-drive.com.ua = owner
stories, other sites = search links; each list shows 5, then "Show N more"). Videos have their own sibling toggle
(`VideoReviews`, 🎬, ❓ + share `?section=videos`), split out 2026-10-04. Links + facts only
(title, category, cover URL, date) in `registry.owner_posts` (migration 0025); lookup = `ownerPostLookup` in
`packages/shared` (infocar's model-slug candidates; only the car's generation year range; newest first, max 30).
**Pick-up point — run the full ingest:**

1. `pnpm db:up && pnpm db:migrate` (0025), then `pnpm ingest:edrive` — every make/model/generation, in the background
   (`[n/149] make: N post(s)` log lines). Estimate **~2.5–4 h cold** at the polite 1 req/s: measured Kia = 1,054
   posts in 4 min 13 s (~250 requests; Kia is a bigger-than-average make, estimate from 5 sampled makes). The site's
   own JSON API (`api.e-drive.com.ua/v1`: `cars/makes`, `cars/models?makeId=`, `cars/generations?modelId=`,
   `request/search?filter=posts&makeId=&modelId=&generationId=&lastId=<last createdAt>`; page size fixed at 10, `limit`
   ignored; robots.txt allows all). A make, then a model, with no posts is skipped before its generations are listed
   (most of the catalog) and a short page ends paging. Nothing is cached on disk, so a re-run costs the same; upserts by
   post id make it idempotent and interruption-safe. Optional first pass: `-- --brand toyota` / the top registry brands
   (~under 1 h) — `--model`, `--limit`, `--max-pages`, `--dry-run` also exist.
2. Add a gz CSV seed like the other tables (`--export-csv`/`--from-csv` are **not built yet**; copy
   `infocar-videos.ts`), then `ingest:edrive:csv` into `ingest:ratings:csv` and the CLAUDE.md list.
3. Measure: posts per brand, share of registry (brand, model) pairs with ≥1 post, and check in a browser (e.g. a Kia
   Ceed II plate shows only 2012-2017 posts). Makes whose name has no brand slug of ours are skipped — list them from
   the log and extend the brand table if common.
4. Known limits: e-drive gives only a generation's **start year** (end = next generation's start − 1, last one open);
   the API exposes no per-post car/generation, so the crawl goes per generation; posts are owner anecdotes (some
   about the make generally) — label them as such, never as reviews. Periodic refresh = re-run (new posts only matter
   for recent generations; a `--since` shortcut could page only until the first already-known `createdAt`).
5. Logos in `public/icons/` (`edrive.png`, new `infocar.png`) shown by `SourceGroup`.

**Step 2c — TopGear UK editorial reviews (topgear.com/car-reviews): planned 2026-10-03, built 2026-10-05 (steps 1–7 done; text-only, no video; step 8 measure + browser check still open).** Shipped: `scripts/src/topgear*.ts`, migration `0027_topgear_reviews.sql`, `topgearLookup` (shared), `topgear[]` on `/api/reviews`, `TopgearReviews` UI group after e-drive, committed `seed-data/topgear-reviews.csv.gz`. Measured on the real run: sitemap yields **1,073 model pages / 111 makes** after dropping `first-drive-N`/`report-N` article series (not 1,607); 1,032 reviews, 1,016 scored; 731 matched a catalog brand before `MAKE_ALIASES` (mercedes-benz, mg-motor-uk, vauxhall, gwm), the remaining unmatched makes are absent from infocar. topgear.com's CDN 403s the `(+https://carsua.app)` UA suffix — the fetcher sends plain `carsua.app-ingest/1.0`. Original plan below. English-language
verdict + score per model, shown as a "TopGear (EN)" subsection of `ReviewLinks` next to infocar/e-drive. Links + facts
only (title, score, date, blurb, url) — never republish review text beyond the meta description.
**Findings (measured 2026-10-03):**
- robots.txt allows `/car-reviews/` (disallows only `/search*`, `/tags*`, `/taxonomy*`, `/node*`, `/mantis*`,
  `/api/search/*`). Plain HTTP + any UA gets 200, server-rendered; no JS/API reverse-engineering. 340–400 KB/page,
  ~0.7–1.3 s each.
- Sitemap `https://www.topgear.com/sitemap.xml?page=1..N` (Drupal simple_sitemap, ~12 pages) lists 4,141 `/car-reviews/`
  URLs: **1,607 model pages** (`/car-reviews/<make>/<model>`, 193 makes) + variant pages (`first-drive`, `2dr`, `spec`…)
  + the four section subpages (`/buying`, `/driving`, `/interior`, `/specs`). The **model page alone** has JSON-LD with
  `Review` + `Rating` (`ratingValue` of `bestRating` 10 — note it is a string `"6"` on some pages, a number on others, and
  `bestRating` too), `datePublished`, `Car`/`Brand`, plus `meta description` (blurb). Subpages add nothing we need.
- Some model slugs carry a generation year range (`sportage-2017-2021`, `niro-2017-2022`, `e-niro-2018-2022`),
  most don't (`ceed`, `ceed-sportswagon`, `octavia`); `-0`/`-1` suffixes are duplicate-slug generations (`sorento-0`,
  `proceed-0`) — the `datePublished` year is the fallback generation anchor.
- **Videos are unconfirmed.** Static HTML has no YouTube ids; the player is Brightcove (3 mentions per page), and
  `bmw/m3` had no video markup at all. Brightcove embeds need TopGear's account/player id and may be domain-restricted.
- **AutoTrader UK (`autotrader.co.uk/cars/reviews?make=Kia&model=Cee%27d`) is not crawlable** — every request incl.
  `robots.txt` hits a Cloudflare managed challenge. Do **not** work around it; search link only.

**Status 2026-10-05 — items 1–7 below are done** (text-only, no Brightcove video: the `video_ref` column was dropped). Differences from the
plan as written: migration is `0027` (`0026` went to `car_models_3d`); the sitemap has **1,073 model pages / 111 makes** (`first-drive-N`,
`report-N` and section slugs are filtered), so a cold run is ~20–25 min, not 35–55; the fetcher's UA omits the `(+https://carsua.app)`
suffix because topgear.com's CDN 403s it; `parseRobots` now merges repeated `User-agent: *` groups (topgear.com repeats it per rule);
TopGear makes map to infocar brand slugs via `MAKE_ALIASES` in `topgear.ts` (mercedes-benz, mg-motor-uk, vauxhall, gwm). Result: 1,032
reviews, 1,016 scored; makes absent from infocar (Ferrari, Lotus, McLaren …) can't surface. UI: "TopGear" group + EN badge after e-drive in
`ReviewLinks`; the About page now also lists infocar.ua, e-drive.com.ua, TopGear, Sketchfab, Google Maps and YouTube.
**Still open:** item 8 (coverage numbers + browser check of a Kia Sportage / BMW X5 / Mercedes plate); AutoTrader UK search link (item 7, not
added); an optional "search YouTube for this car" link in the Video reviews section (requested 2026-10-05, scope unconfirmed).

**TODO (original plan, kept for reference):**
1. **Trial (~5 min).** `scripts/src/topgear-fetch.ts` (reuse the fetch/cache/robots helpers from `infocar-fetch.ts` — 1
   req/s, cache HTML in `scripts/.data/topgear/`, check robots first) + `scripts/src/topgear-parse.ts` (pure: JSON-LD
   `Review`/`Rating` → `{ rating, bestRating, publishedAt, headline, blurb }`, tolerant of string/number
   `ratingValue`/`bestRating`; Zod-validate the JSON-LD per CLAUDE_RULES). Commit 2-3 fixtures under
   `scripts/src/fixtures/topgear/` (`kia-ceed-sportswagon.html` trimmed to the `<script type="application/ld+json">`
   blocks + `<meta name=description>`, a year-slug model, a no-rating page) and unit-test the parser on them. Run a
   `--brand kia --dry-run` over ~10 models. **Decision point:** inspect the Brightcove markup (`data-video-id`,
   `data-account`, `data-player`, a `VideoObject` JSON-LD) on ~10 pages — is a per-review video id extractable and
   embeddable cross-origin? If not, ship text-only and drop the `video_ref` column/UI (don't add a Brightcove player).
2. **Migration `0026_topgear_reviews.sql`** + Drizzle `topgearReviews` table in `packages/db`: `url` PK, `make`,
   `brand_slug` (our brand slug), `model_slug` (TopGear's), `title`, `rating` (numeric, nullable), `best_rating`,
   `published_at`, `year_from`/`year_to` (nullable, from slug range), `blurb`, `video_ref` (nullable; only if step 1 says
   yes). Index on `(brand_slug, model_slug)`.
3. **`scripts/src/topgear.ts` + root script `pnpm ingest:topgear`** (`--brand kia`, `--limit N`, `--dry-run`, `--refresh`):
   fetch + parse the sitemap pages → keep six-segment `/car-reviews/<make>/<model>` URLs only (drop variant + section
   pages) → map `<make>` to our brand slug (list makes with no match from the log; extend the brand table if common) →
   fetch each model page, upsert by `url` (idempotent, interruption-safe; HTML cache makes a re-run seconds). Log
   `[n/1607] make/model: score`.
4. **Full cold run — ~35–55 min** (1,607 × ~1 s fetch + 1 s polite delay, background). Then `--export-csv` →
   `scripts/seed-data/topgear.csv.gz` (small, ~100–200 KB), `pnpm ingest:topgear:csv` + `export:topgear:csv`, add the CSV
   load to `ingest:ratings:csv` and all three commands to the CLAUDE.md list + Layout row.
5. **Lookup:** `topgearLookup(brand, model, year)` in `packages/shared` (candidates from `infocarLookup`'s model-slug
   logic + TopGear variant slugs like `ceed-sportswagon`, `-0`/`-1` suffixes; year range from slug when present, else
   `published_at` year within the car's generation; newest first; max ~5; Zod schema for the response). Unit tests for the
   Kia Ceed / Sportage / Niro slug cases above. Changing the schema discards users' offline cache — expected.
6. **API:** `topgear[]` on `GET /api/reviews` (`ReviewsService`, reads the new table; `@Inject(...)` on ctor deps).
7. **UI:** "TopGear (EN)" `SourceGroup` in `ReviewLinks` (logo `public/icons/topgear.png`, score badge `7/10`, blurb,
   "Show N more" like the others); en/ua/ru i18n strings; keep it in `lib/offline-cache.ts`'s persisted `/api/reviews`
   rule. Add an **AutoTrader UK search link** under "other sites" via `reviewLinks()` (`?make=<Make>&model=<Model>`,
   URL-encode the apostrophe — open it in a browser to confirm the pattern still works; link only, no fetching).
8. **Measure + browser check:** reviews per brand, % of registry (brand, model) pairs with a TopGear hit (expect lower than
   infocar: UK catalog, few Lada/ZAZ/Chinese models), and eyeball a Kia Ceed II, a Skoda Octavia and a Toyota RAV4 plate.
   Record the numbers here and move this entry to `docs/plan-done.md` when finished.
9. Known limits to document: TopGear has no per-year pages (coarse generation matching); UK-market models only; scores
   are TopGear's /10 — label the source clearly; periodic refresh = re-run (new reviews are rare, the sitemap `lastmod`
   could drive a `--since` shortcut).

**Step 2d — Auto news (RSS): planned 2026-10-04, nothing built.** A "News" subsection/toggle that shows recent Ukrainian
auto-news headlines relevant to the car (make+model+year → make+model → make only). Links + facts only (title, ≤300-char
description, image URL, date, url) — never republish article text.
**Feed findings (measured 2026-10-04, all plain HTTP 200, robots allow):**
- `https://eauto.org.ua/rss` is the *how-to* HTML page; the real feed is `https://eauto.org.ua/rss.xml` (UTF-8, 50 items, uk;
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
   + short summary only, always link out and attribute the source.

**Step 2 status (2026-10-03): built; full crawl not run yet.** Done: migration `0023_car_videos.sql` + `carVideos` table;
`scripts/src/infocar-video-parse.ts` (+ tests on `fixtures/infocar/video-kia.html`, `video-19231.html`);
`infocar-fetch.ts` (fetch/cache/robots helpers extracted from `infocar.ts`); `pnpm ingest:infocar:videos [-- --brand kia
--max-pages N --limit N --dry-run --refresh]` + `:csv`/`export:…:csv` (CSV `seed-data/infocar-videos.csv.gz` not yet
created). Findings: video pages expose the YouTube id (`iframe` embed) and the model via `link[rel=canonical]`
(`https://kia-stonic.infocar.ua/video19231_stonic_id7412.html`) — so even generic titles ("Готовий до будь-яких
завдань") get a model; year only from titles (rare). The RSS feed has just the latest 20 (incremental use only). Trial
run KIA page 1: 10/10 videos got id + model + date + duration. **API + UI done (same day):** `videoLookup` in `packages/shared` (model slug via `infocarLookup`'s candidates, plus
variant slugs like `superb-combi`; year-in-title first, then newest; max 6), `videos[]` on `GET /api/reviews`
(`ReviewsService` reads `car_videos`), `VideoReviews.tsx` under `ReviewLinks` in `ResultCard` (shares the reviews
query, hidden when empty, thumbnail → `youtube-nocookie` iframe only on click). Test data: 6 brands × 2 pages (119
videos) in the local DB. **Year filter:** the video page's canonical `…_id7347.html` is infocar's generation id = the catalog version page
`test_rav4_id7347.html` (RAV4 2026), stored as `car_videos.generation_id` (migration 0024); `videoLookup` maps it to the
generation's year range via the catalog rows, so a 2017 RAV4 gets 2015-2018 videos only. No generation in the catalog →
title year within ±3 of the car's year, or no title year, ranked after exact-generation videos. UI toggle now has ❓ info,
animated open, and plays in `YouTubeModal`. **Left:** full crawl (one request per listing page + per video, hours at 1 req/s — run
`ingest:infocar:videos`, then `export:infocar:videos:csv`), YouTube API enrichment (optional), add the CSV load to
`ingest:ratings:csv`, check the strip in a browser (e.g. a Skoda Superb or Toyota RAV4 plate). UI since merged: videos now sit in the single "Reviews, videos & owner stories" toggle under an infocar.ua heading (Step 2b).

**Step 0 — shipped (2026-10-03): link-only helper, no fetching.**
`reviewLinks(brand, model)` in `packages/shared/src/reviewLinks.ts` returns each site's
own page/search (URL patterns opened and confirmed 2026-10-03): infocar
`/test-drive/<brand>/<model>/` + `/reviews/<brand>/<model>/` (brand page when the model
isn't a plain-Latin slug), auto-blog `/uk/?s=`, drive2 `/search?text=` tagged `ru`.
**Superseded by Step 1:** the infocar links now come from the crawled catalog, the UI block is live,
and the guessed infocar URLs described here were removed. avtoporadnyk (no working search) and nv.ua
(403, `/search` disallowed) are left out; drive2 model pages need a numeric id so can't
be built from a name. No year (no verified year/generation URL). Known gap: an infocar
model slug the registry text doesn't match is a dead link → curate a verified
(brand, model) list if common. Nothing is crawled or stored. UI: `ReviewLinks.tsx`, a collapsed "Reviews & test drives"
section in `ResultCard` (between photos and nearby services; `rel="noopener noreferrer
nofollow"`, "RU" chip on drive2). No share-button/`?section=` deep link yet. Per-model
direct paths (infocar `/test-drive/<brand>/…`, drive2 `/cars/<brand>/…`) are
deliberately not guessed — verify in a browser before adding any. autoarmor dropped.
The crawl/DB steps below stay optional; do them only if links alone aren't enough.

Goal: on each make/model/year page, show "Reviews & test drives" — links with
title, source, language, thumbnail, ≤300-char excerpt. **Links + short excerpts,
not copied full text** (Ukrainian TDM exception is research-only; DB right 15 y).
MVP = 100-1000 top make/model combos from the registry, extend later.
Order: **A. text reviews → B. YouTube.**

Sources (checked 2026-10-02/03, robots.txt + one page each — volumes unmeasured):

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

**Step 1 — infocar catalog ingest (shipped 2026-10-03; match-rate measurement left)**

**Status (2026-10-03): shipped, except the match-rate measurement.** Built: migration `0020_infocar_versions.sql` +
Drizzle table; `scripts/src/infocar-parse.ts`, `infocar-robots.ts`, `infocar.ts` (+ tests on the saved pages in
`scripts/src/fixtures/infocar/` — raw windows-1251, `-text` in `.gitattributes`, prettier-ignored); `pnpm ingest:infocar
[-- --brand kia --limit N --dry-run --refresh]`, `ingest:infocar:csv` (also in `ingest:ratings:csv`),
`export:infocar:csv`; `infocarLookup` in `packages/shared`; `GET /api/reviews?brand=&model=&year=`
(`apps/api/src/reviews/`, `reviewsResponseSchema`); web: `reviewsQuery` + a `reviews` offline-cache group (cap 400),
`ReviewLinks.tsx` un-hidden in `ResultCard` (fetches when the section is opened) with `InfocarReviewRows.tsx`. The
guessed infocar URLs were removed from `reviewLinks` (the drive2 search remains; auto-blog was dropped later).

**First full crawl:** 153 brands (88 with test drives) → 5546 rows. Reviews: 1363 models / 1171 versions; test drives:
1152 models / 1860 versions; 1681 model rows have no version cards (they link to the model page); every version has a
year range; zero crawl failures. Committed `seed-data/infocar-versions.csv.gz` (85 KB).

**Follow-ups (2026-10-03, after the first crawl) — done:**

- Year-filtered owner-reviews link: `yearUrl` on `InfocarMatch` = model page + `?y1=<year>&y2=<year+1>&sort=0` (y2
  capped at the current year); only the reviews tree has the filter (test-drive pages ignore it). The version list
  now includes every version overlapping year..year+1, ones covering the year first.
- Model matching (`infocarLookup.ts`): punctuation squashed (`CEE'D` -> `ceed`), BMW trims -> `N-series`, Mercedes
  `E 200` -> `e-class` (`ML` -> `m-class`), leading-word / lone-word / shortened-factory-code matches, a few aliases
  (VW CC/Beetle/e-Golf, Pajero, Forte). `infocarBrandSlug` maps mercedes-benz->mercedes, ssangyong->ssang-yong,
  lada->vaz (used by the lookup and `ReviewsService`; before this Mercedes/ВАЗ/SsangYong never matched).
- **Match-rate measurement** (top 800 registry (brand, model) pairs, ~12.2M rows, owner-reviews tree, year 2013):
  brand-page-only fallbacks 856k -> 441k, unknown-brand 1.8M -> 351k. What is left is mostly not in the catalog
  (ЗАЗ/ГАЗ/DAF/Geely/Lifan/КАМАЗ variants, some Tesla/Audi/Volvo/Dodge models only in the other tree). Next lever if
  wanted: per-model aliases for the remaining high-volume misses; the throwaway eval script was deleted (dump
  `infocar_versions` + top pairs via `docker exec … psql` and run `infocarLookup` over them to redo it).
- UI: ❓ section info + 🔗 share button (`?section=reviews`, new `ShareSection`), infocar logo (`public/icons/infocar.png`)
  beside the Infocar labels, DRIVE2 logo (`public/icons/drive2.png`). A large faint infocar watermark behind the
  Infocar block was tried and **hidden on request** (left-aligned, 224px, 10% opacity) — re-add in `ReviewLinks.tsx`
  if wanted. Auto-Blog removed from `reviewLinks` (irrelevant search results); drive2 stays link-only.
- **Not verified end to end in a browser** — covered by unit tests (shared lookup, helpers, reviews service); open
  ВС6743РН (Kia Ceed 2012) and ВС4170МІ (BMW 328, 2013) and expand "Reviews & test drives" to confirm.

Facts found while parsing: the `/test-drive/` page lists only ~15 brands + a numeric-id `<select>`, so **brands come
from `reviews/marks.html`** (153) and each is tried in both trees (404 → skipped); marks has no Russian/Soviet section
markup — `is_ru` is the second alphabetical run (the list is sorted by display name, so slugs wobble: only a big
first-letter drop counts); version-card `title` attrs say "Отзывы про …" in both trees (copy-paste) — name/years are
read from the card's `<span>`s; a model with no carousel gets just its model row. **infocar never writes an open-ended
range** — a model still in production ends at the current year (max `year_to` 2026), so the lookup's
`null year_to = current year` rule is only a safety net.

Goal: crawl infocar's whole brand → model → version tree once and store, per version, the
name, year range and URL, so a car (brand, model, year) links to its exact generation page
(e.g. KIA CEED 2019 → "Ceed 2018–2021"). Facts + links only — no article text. Other sites
(avtoporadnyk, auto-blog, drive2, driver.top, nv.ua) come later as separate adapters.

Verified structure (2026-10-03, via browser screenshots + page fetches):

- `https://www.infocar.ua/test-drive/` — brand list ("Оберіть марку"/50+ brands).
- `https://www.infocar.ua/test-drive/<brand>/` — "Оберіть модель KIA": model links
  `/test-drive/<brand>/<model>/` (kia: avella … venga, 31 models).
- `https://www.infocar.ua/test-drive/<brand>/<model>/` — "Оберіть версію KIA Ceed": a
  carousel (arrows) of version cards: name ("Ceed", "Ceed GT", "Ceed SW", "ProCeed", …) +
  year range ("2018 - 2021") + link to a version page on a **per-model subdomain with a
  numeric id**: `//kia-ceed.infocar.ua/test_ceed_id5550.html` (protocol-relative `//`).
  Ceed has 17 versions. The same page also lists test-drive articles
  (`/test-drive/kia/ceed/<id>.html`), paginated `./page_2.html`…`page_7.html` — not needed
  for the catalog. Owner reviews live in a parallel tree `/reviews/<brand>/<model>/`
  (`//skoda-octavia.infocar.ua/review_octavia-a7_id5028.html`) — a possible second pass.
- Pages appeared windows-1251 in one fetch tool (garbled Cyrillic) — **check the response
  charset/headers and decode accordingly**; don't assume UTF-8.
- robots.txt: `Disallow` `/*?`, `/fav/`, `/search.html`, `/reviews/add/`, `/forum/`, `/account/`,
  `/new_export/`; `BUbiNG` fully blocked; no crawl-delay, no sitemap. Catalog paths are
  allowed. Fetch plain URLs only (no query strings), ≤1 req/s, honest User-Agent (no
  personal email in it), respect robots.txt at runtime.
- Volume estimate (unmeasured): ~50 brands + ~600 models ≈ 650 requests ≈ 11 min at 1 req/s.
  **Both trees below double that (~22 min), still one run.**

**Second tree — owner reviews (same ingest, `tree = 'reviews'`)**, verified 2026-10-03:

- `https://www.infocar.ua/reviews/marks.html` — all brands, alphabetical, **with review
  counts** (Acura 37, Audi 312, Hyundai 914, Ford 906, …); sections "international" and
  "Russian/Soviet" (ВАЗ, ГАЗ, ЗАЗ, УАЗ …) — store both, tag the latter.
- `https://www.infocar.ua/reviews/<brand>/` — models with **review counts** and a brand
  average (KIA: 4.5★ from 858 reviews; Sportage 169, Ceed 123, Rio 102 …).
- `https://www.infocar.ua/reviews/<brand>/<model>/` — "Оберіть версію KIA Ceed": version
  cards **with their own year ranges that differ from the test-drive tree** (reviews: Ceed
  2018–2021, 2015–2018, 2012–2015, 2009–2012, 2006–2009, ProCeed 2019–2021, XCeed 2019–2022;
  test-drive tree has 17 versions incl. GT/SW). Version hrefs are on per-model subdomains
  (`//skoda-octavia.infocar.ua/review_octavia-a7_id5028.html` is a single review). **Not
  captured by the page fetcher — read the real version-card hrefs from raw HTML.**
- Same page: model average rating + review count, a list of reviews (title "KIA Ceed 2020",
  engine, gearbox, mileage, per-review rating, pagination `page_N`), and a **"Рік виготовлення
  від … до …" filter** (years 2007–2020 in the dropdown, sort "спочатку з фото") — a GET form
  whose real parameter names are **unverified** (read them from the form markup / DevTools).
  `robots.txt` disallows `/*?`, so **never crawl filter URLs**; but a plain link for a user
  to `…/reviews/kia/ceed/?<year params>` is fine and gives "reviews of this car's year" —
  build it only after the param names are confirmed, and keep the version-card link as the
  fallback (works without the filter).
- Store per model: `review_count`, `avg_rating` (facts, shown in the UI as "Ceed — 123
  reviews, 4.5★"). Do **not** store review text/authors (copyright, personal data).

Build:

1. `scripts/src/infocar.ts` (style of `euroncap.ts`/`kncap.ts`): `pnpm ingest:infocar`
   (crawl, cache raw HTML in `scripts/.data/infocar/`, `--refresh` to re-fetch, `--limit`/
   `--brand` for trial runs, `--dry-run`), `ingest:infocar:csv` / `export:infocar:csv`
   (committed gz CSV in `seed-data/`, like the ratings). Parsing as pure functions in a
   `scripts/src/infocar-parse.ts` with saved-HTML fixture tests (brand list, model list,
   version cards). Version cards: normalise `//` URLs to `https://`, parse "2018 - 2021" →
   `year_from`/`year_to` (open-ended/"н.в." ranges → null `year_to`; check how infocar writes
   current models).
2. Migration `NNNN_infocar_versions.sql`: `registry.infocar_versions` — `tree`
   (`test_drive`|`reviews`), `brand_slug`, `model_slug`, `model_name`, `version_name`,
   `year_from`, `year_to`, `url` (UNIQUE), `review_count` + `avg_rating` (model-level,
   reviews tree only, null otherwise), `fetched_at`. Index (brand_slug, model_slug, year_from). Add the CSV load to
   `ingest:ratings:csv`/`ingest:all`. Zod schema + types in `packages/shared`.
3. Lookup (pure, in `packages/shared`, tested): brand via `brandSlug`; model by slug match
   (registry model text is free-form: try full slug, then first token; infocar slugs like
   `enyaq-iv`, `ev6`); versions whose `year_from ≤ year ≤ year_to` (ranges overlap at the
   edges — return all); prefer the version whose name equals the registry model (`CEED SW`),
   else the plain one; fallbacks: model page → brand page → nothing. Never emit a URL not in
   the catalog (this is the dead-link fix for `reviewLinks`).
4. API `GET /api/reviews?brand=&model=&year=` (Zod, no logic in the controller, explicit
   `@Inject`) returns, per tree, the matching version link(s), the model link and the
   review count/avg rating; add to the persisted-cache rules in `lib/offline-cache.ts`.
   Then un-hide `ReviewLinks.tsx` in `ResultCard.tsx`: two infocar rows — test drive
   (version name + years) and owner reviews ("123 reviews, 4.5★", version link, plus the
   year-filtered link once its params are confirmed).
5. Measure after the first real run: brands/models/versions counts, and the match rate of
   registry (brand, model, year) top combos against the catalog; list the misses.

Open: how infocar prints still-in-production ranges; models with no version cards; whether
the per-model subdomain pages are the best link or `/test-drive/<brand>/<model>/` is better.

**Step 2 — infocar videos (YouTube channel + infocar's own `/video/` section), after Step 1**

Goal: videos linked to specific cars, with a relation to the infocar catalog from Step 1
(same brand/model/version rows). Channel: `youtube.com/@InfoCarUa` as given; infocar.ua links
`youtube.com/infocartv` / `/user/infocartv` — **confirm they are the same channel** (channel id
via `channels.list?forHandle=InfoCarUa` and `forUsername=infocartv`) before ingesting. The
YouTube page itself couldn't be read by the page fetcher (JS-rendered, returned only the
footer), so subscriber/video counts and title style are **unmeasured**.

Two complementary sources (verified 2026-10-03 on the infocar side):

- **infocar `/video/`** — videos are organised by **category** (`/video/test-drive/`,
  `/video/infocar/`, `/video/chtopochem/`, moto, pranks, crashes …) and by **brand**
  (`/video/<brand>/`, 100+ brands: volvo, toyota, porsche …); single video
  `/video/<id>.html` (e.g. `19259.html`); `/video/all/`; **RSS `/rss/video.php`**. This is
  infocar's own brand tagging, i.e. the car relation for free. Check whether a video page
  exposes the YouTube id (embed/`data-` attr/iframe `src`) — if so that's the join key.
  robots.txt does not disallow `/video/` (only `/*?`, forum, account … — re-read at runtime).
- **YouTube Data API v3** (needs `GOOGLE_API_KEY` — **already added to `apps/api/.env` by the
  user, 2026-10-03; free, no paid plan, 10,000 units/day quota; not yet tested against the
  API; make sure "YouTube Data API v3" is enabled in that Cloud project and the key is
  restricted to it**) — authoritative metadata for the channel:
  `channels.list` (1 unit) → uploads playlist id → `playlistItems.list`, 50 per page, 1 unit
  per page → `videos.list` for details, 1 unit per ≤50 ids. A whole channel of a few thousand
  videos costs on the order of 100-200 units — far below the 10,000/day default; `search.list`
  (100 units, ~100 searches/day) is **not needed** for a single channel. Store `youtube_id`
  (permanent) and refresh title/thumb/views at least every 30 days (YouTube ToS: non-authorized
  data ≤30 days); embed with the standard player/oEmbed; no HTML/transcript scraping.

Ordering: do the **infocar `/video/` + `/rss/video.php` pass first** (no key; brand/category/
article relation, YouTube id if exposed), then use the API only to fill in what that pass
lacks (duration, views, exact publish date, videos not on `/video/`). YouTube's own RSS
(`feeds/videos.xml?channel_id=UC…`, no key) only returns the latest ~15 — fine for
incremental refresh, not for the back catalogue.

Build:

1. Table `registry.car_videos`: `youtube_id` UNIQUE, `title`, `published_at`, `thumb_url`,
   `duration_s`, `category` (test_drive|review|other, from infocar's category or title),
   `infocar_video_url` (nullable), `infocar_article_url` (nullable — the linked test drive
   if the video page/title points to one), `brand_slug`, `model_slug`, `version_id`
   (nullable FK → `infocar_versions`), `year_from`/`year_to` (nullable), `match_method`
   (infocar_brand_page|title|manual), `confidence`, `fetched_at`, `refreshed_at`.
2. Ingest `pnpm ingest:infocar:videos` (+ `…:csv`/`export:…:csv`): (a) walk
   `/video/<brand>/` listings (or the RSS for increments) → infocar video url, title, brand,
   category, youtube id if exposed; (b) pull the channel via the API; (c) join on
   `youtube_id`, else fuzzy title match; videos only the API knows get brand/model from the
   shared title matcher (`brand + model + year` against the Step 1 catalog; low confidence →
   hidden review queue). Quota-aware, resumable, `--dry-run`.
3. Matching a car's year to a video: the title usually names make/model (and often year or
   generation, e.g. "KIA Ceed 2018") — parse with the Step 1 catalog's versions: video →
   version whose range contains the parsed year, else the model. Videos that are generic
   (pranks/crashes/news) get no car and are skipped.
4. API: extend `GET /api/reviews` with `videos[]` (youtube_id, title, thumb, published_at,
   version name); UI: a "Videos" row/strip with thumbnails that **embed on click**
   (privacy: don't load the iframe until the user clicks), link back to the infocar article.
5. Measure first: channel video count, % of titles with a parsable make/model/year, % that
   match a Step 1 version, overlap between the channel and `/video/` listings.

Open: same-channel confirmation; whether to include only test-drive/review categories;
whether `/video/` pages expose the youtube id; per-brand pagination depth.

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

**A. Text reviews — steps**

1. Migration `NNNN_car_reviews.sql`: `registry.car_reviews` — `id`, `source`,
   `url` UNIQUE, `title`, `kind` (article|owner_post|forum|video), `lang`
   (uk|ru|en), `make`, `model`, `year_from`, `year_to`, `confidence`
   (high|medium|low|unmatched), `match_method` (url|tag|title|text|manual),
   `thumb_url`, `excerpt`, `published_at`, `fetched_at`, `youtube_id` (null
   until B). Indexes: (make, model), (make, model, year_from). Zod schema +
   types in `packages/shared`.
2. Matcher in `scripts/src/reviews/match.ts` (pure, fixture-tested): alias
   dictionary built from the registry's make/model values (Cyrillic + Latin) →
   parse in order URL → tags/category → title → first 500 chars; year by
   `19xx|20xx` regex + a small curated generation→year-range table
   (`seed-data/generations.csv`, start with the top ~150 models; seed from
   Wikidata, hand-fix). Unmatched/low go to a review queue, hidden in UI.
3. Adapters, one file each (`scripts/src/reviews/<source>.ts`), same style as
   `euroncap.ts`: infocar → avtoporadnyk → auto-blog (WP API) → driver.top
   (after inspecting `/exp/`; only public pages, only listing metadata) →
   nv.ua (optional). Shared polite fetcher: honour robots.txt, ≤1 req/s, clear
   User-Agent, `If-Modified-Since`/ETag, cached raw HTML in `scripts/.data/`
   so re-parsing needs no re-crawl.
4. Curated link-only rows for drive2 (and forum links) from
   `seed-data/review-links.csv` (make, model, url, lang, kind).
5. CSV export/import like the ratings (`pnpm export:reviews:csv`,
   `pnpm ingest:reviews:csv`) so a fresh clone loads in seconds.
6. API: `GET /api/reviews?make=&model=&year=` — ranking: exact generation →
   same model → same brand; UK before RU; add to the offline cache rules in
   `lib/offline-cache.ts` (size-capped). UI block on plate/VIN pages with a
   source badge and a "RU" chip; outbound links `rel="noopener nofollow"`.
7. Tests: matcher fixtures per source, adapter parse fixtures (saved HTML),
   API ranking.

Time (estimates): crawl a few hours unattended at 1 req/s; dev ~3-5 working
days (matcher is the long pole). First step: crawl 20 models from infocar +
driver.top, measure counts and match rate before building the rest.

**B. YouTube — after A**

- Channel route: `playlistItems.list` over ~20 curated UA channel uploads
  (1 quota unit / 50 videos) + title→make/model/year via the same matcher.
- Search route: `search.list` per top model ("<make> <model> <gen> тест-драйв",
  `regionCode=UA`, `videoCategoryId=2`); 100 searches/day on the default 10k
  quota → ~3 days for 300 models; `videos.list` (1 unit/50) for details.
- Store only `youtube_id` + our own match fields; refresh title/thumb/stats
  ≤ every 30 days (YouTube ToS: non-authorized data ≤30 days). Embed via the
  standard player/oEmbed. No HTML/transcript scraping.
- Env: `GOOGLE_API_KEY`. Only `apps/api` loads `.env` (`tsx watch --env-file-if-exists=.env`);
  `scripts/` run plain `tsx src/<file>.ts` and load none. So the video ingest script's
  `package.json` entry must pass `--env-file-if-exists=../apps/api/.env` (cwd is `scripts/`
  under `pnpm --filter`), read the key with a Zod-checked, scripts-local env read, and exit
  with a clear message when it is absent (the key is optional — see ordering below). The key
  is server/script-side only; never ship it to `apps/web`, never log it, never put it in a
  URL that gets logged or cached (`?key=` goes in the request only; redact on errors).

Open questions: driver.top `/exp/` content quality and ToS; drive2 permission
route; how many generations to curate for MVP; whether to show owner posts
(driver.top) in the same block as editorial reviews or a separate tab.

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

Sources (all free, no key; licence terms not re-verified — check before building):

- **fueleconomy.gov** (US DOE/EPA) — first, easiest. `vehicles.csv.zip` bulk download (also `/ws/rest/` JSON/XML).
  1984+, MPG city/hwy/comb, CO2 g/mi, fuel type, EV range + kWh/100mi, GHG/smog score. Public domain. EPA test
  cycle (reads lower than WLTP). Many UA cars are US imports. Key columns: `make`, `model`, `year`, `comb08`,
  `co2TailpipeGpm`, `fuelType1`, `displ`, `cylinders`, `atvType`.
- **EEA CO2 monitoring of new passenger cars** (data.europa.eu / EEA Datahub) — EU-origin cars. Per-registration
  yearly CSVs (large): make, model, variant, engine cc/kW, fuel, CO2 g/km (NEDC → WLTP), consumption on newer
  years. Aggregate to make/model/year/engine/fuel at load time, don't store raw rows.
- **NRCan Fuel Consumption Ratings** (open.canada.ca) — CSV 1995+, already L/100km; fallback for N. American models.
- Optional/later: UK VCA car fuel data (open CSV); Spritmonitor.de (real-world consumption, no API → scraping,
  check ToS). Skip commercial APIs (CarAPI, Auto.dev, API Ninjas: paid or non-commercial free tiers — see the
  "no free RIA-alternative" survey in the parked section).

Design (follow the NCAP pattern — `scripts/src/euroncap.ts` + committed gz CSV in `scripts/seed-data/`):

- Tables `registry.fuel_economy_*` (or one `fuel_economy` table with a `source` column): make/model/year range,
  engine cc, fuel type, `co2_g_km` (**normalize EPA g/mi ÷ 1.609 on load**), `l_100km`, `cycle` (`EPA`|`NEDC`|`WLTP`),
  `source`. Never mix cycles unlabeled — show the cycle next to the number.
- `scripts/src/fuel-economy.ts` + `ingest:fuel:csv` / `export:fuel:csv`, wired into `ingest:ratings:csv`.
  Raw bulk downloads cached in `scripts/.data/` (gitignored); only the aggregated CSV is committed.
- **Matching** registry row → reference row: fuzzy on normalized make + model + year + fuel + engine capacity
  (reuse the NCAP model-name normalization/aliases; registry `fuel` is free text — do the "Fuel-type icons"
  distinct-values research below first, the mapping is shared). Return a **range** when several trims match
  ("6.5-7.2 L/100km"), and say "similar vehicles", never claim an exact match. Measure the real match rate
  on the full dataset before building UI.
- **Refresh cadence — manual/annual, not scheduled.** All sources are bulk files that change rarely, so no
  cron, no live API calls from the app, and no scraping in the request path:
  - fueleconomy.gov: DOE republishes `vehicles.csv.zip` as new model years are certified (several times a year,
    mostly Q4-Q1). Re-run ~**2x/year** (e.g. Jan + Jul) or when a new model year appears; cheap — one ~10 MB zip.
  - EEA: one release per reporting year, final data lands roughly **once a year** (provisional ~mid-year, final
    ~autumn/winter). Re-run **annually** when a new year file is published.
  - NRCan: one new file per model year, **annually** (~autumn).
  - Spritmonitor (if ever added): scraping, so on demand only, rate-limited, never scheduled.
  - Fetch via the script's own download (CSV, cached in `scripts/.data/`), then `export:fuel:csv` → commit the
    aggregated gz CSV. Prod loads the committed CSV (`ingest:fuel:csv`, seconds) — same as the NCAP tables, which
    also have no scheduler. Store the source file's `last_modified`/release year in the table (or a small
    `ingested_resources`-style row) so the script can say "already current" and skip. If a VPS exists (Phase 4),
    optionally a monthly job that only _checks_ for a newer release and notifies, never auto-overwrites.
- **Score (0-100):** linear on CO2 g/km, clamped — e.g. 0 g/km → 0, ≥ ~300 g/km → 100 (constants in
  `packages/shared`, `CONSTANT_CASE`, tune against the real distribution of matched rows). Pure EV → 0 (tailpipe
  only; label as "tailpipe"). Bands for the icon colour: green/yellow/orange/red. Hybrids/PHEVs: use the
  rated combined CO2, note the caveat. Score and colour thresholds live in shared, with unit tests.
- API: add fields to the plate/VIN response (Zod schema in `packages/shared` — note this discards users' saved
  offline data) or a separate `/api/fuel/:...` query added to `lib/offline-cache.ts` persisted rules (small, cache it).
- UI: new `CO2Badge` component (default export, ref-as-prop, hook for logic), i18n keys ua/ru/en, tooltip
  explaining source + test cycle + "estimate for similar vehicles". Hide entirely when no match.

First steps when picked up: download `vehicles.csv.zip`, run the match-rate check against the real registry
(make/model/year/fuel/engine), then migration + shared Zod schema + ingest script with a fixture test; add EEA
second, only if the US-only match rate leaves too many EU cars uncovered.

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
- **Car images by year/trim/color ✅ DONE (2026-09-24)** — see Phase 1.5
  "Vehicle photos (Pixabay)" above. Implemented via
  [pixabay.com's image search API](https://pixabay.com/api/docs/) keyed on
  brand/model/year only, not trim/color — Pixabay's search doesn't support
  that granularity, so shown photos are illustrative for the make/model, not
  matched to the registered vehicle's actual color or trim.
- **Car brand logos ✅ DONE (2026-09-24)** — see Phase 1.5 "Vehicle-kind icon
  (animated, colored) + brand logo" above. Went with bundling from
  car-logos-dataset (MIT-licensed, not carlogos.org — that site states no
  reuse license at all), not a live logo service/CDN — a `brand → logo asset`
  lookup (`brandLogoUrl()` in `@carplates/shared`) matching bundled static
  files, same pattern as `plate_regions` for stats.
- **Vehicle body-shape / silhouette images ✅ DONE (2026-09-24)** — see Phase
  1.5 above. **Not** NHTSA vPIC in the end: those per-body-class PNGs
  (`vpic.nhtsa.dot.gov/decoder/images/{bodyClassId}/{n}.png`) turned out to be
  an undocumented, unofficial asset path (no stated mapping from image index
  to body class, no ToS, inconsistent styling between images) keyed to
  NHTSA's own body-class taxonomy — which the Ukrainian registry's `kind`
  values don't share, so using them wouldn't have avoided building a
  `kind → shape` mapping anyway. Used 5 user-supplied SVG silhouettes instead,
  recolored per-vehicle via CSS custom properties.
- **Fuel-type icons** — show an icon per fuel type on the result card.
  **RESEARCH first**: the registry's `fuel` column is free text with no fixed
  enum in this codebase (unlike `body`/`kind`/`color`, which already have
  `stats_by_*` rollups) — enumerate the actual distinct values in the real
  dataset (e.g. `SELECT DISTINCT fuel FROM registry.registrations`) before
  picking/drawing an icon set, since Ukrainian-source values won't map 1:1 to
  a generic fuel-type icon library.
- **Vehicle-kind icons ✅ DONE (2026-09-24)** — see Phase 1.5 "Vehicle-kind
  icon (animated, colored) + brand logo" above.
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
