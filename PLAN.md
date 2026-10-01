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
inside the *existing* camera/upload flow — validates the model with zero AR
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
  the read isn't 8 chars. A box touching an *inner tile edge* is a plate cut by
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
- **Idea, not built:** use the photo date to show who held the plate *on that
  date* (the registry keeps full history), and flag a read that only matches an
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
4. **Fine-tune the detector** only if step 2-3 leave missed *detections*
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
- ⏳ **VinResult history section rename + show current plate** — small,
  unblocked fix identified 2026-09-23 (see Phase 1.5 "Open" note above):
  retitle its timeline from `vin.registryTitle` to `result.historyTitle` for
  consistency with `ResultCard`, and surface `registry.plate` /
  `registry.plateInferred` as a headline line (mirroring how `ResultCard`
  headlines its VIN link) since the data already comes back from
  `/api/vin/:vin` and is currently unused on that page.

- 📋 **Wanted (stolen) vehicles** — planned 2026-10-01, researched, not started.
  See "Wanted vehicles ingest" below.

- 📋 **Link-preview follow-ups** (2026-10-01): (a) e-Ukraine typeface (thedigital.gov.ua/fonts, Dropbox
  download) for the OG cards — blocked on confirming its license (page only says CC BY 4.0 for "content") and
  glyph coverage (ї є ґ) + TTF/OTF files; the site itself stays on the system font stack; (b) test a real
  unfurl through ngrok/prod (Telegram, Facebook debugger) once deployed.

- 📋 **Fuel economy & emissions (CO2 score + icon)** — planned 2026-10-01, researched, not started.
  See "Fuel economy & emissions" below.

### Wanted vehicles ingest — planned (2026-10-01), not started

Source: data.gov.ua dataset `ac1a3a9d-512b-446b-9b0c-1383d38ce474` (National
Police, CC-BY, "more than once daily"). Resource `CarsWanted.json`
(`2d69d196-02f1-49b9-97fa-0fb69077e05f`), ~36 MB, one JSON array replaced in
place. Fields (all required): `id`, `brand`, `model`, `cartype`, `color`,
`vehiclenumber`, `bodynumber`, `chassisnumber`, `enginenumber`,
`illegalseizuredate`, `organunit`, `insertdate`. No status / found-date field.
Record count unverified (~80-100k estimated) — check on first download.

**Key finding:** the file is a full snapshot of the *current* list, so a found
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

### Fuel economy & emissions (CO2) — planned (2026-10-01), researched, not started

Goal: on the result card show fuel consumption + CO2 for the car's make/model/year/engine, plus a single
**0-100 "emissions badness" score** with an easy-to-read CO2 icon (cloud-with-CO2 glyph, green→red gauge/fill;
0 = clean, 100 = worst). Reference-data feature, same shape as the NCAP ratings — **not** a live API call.

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
    optionally a monthly job that only *checks* for a newer release and notifies, never auto-overwrites.
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
