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

- ✅ **Side widgets — Bluesky posts + share price** (2026-10-06, `037f7a7` / `7b225cb` / `c8d9950`) — built, see `docs/plan-done.md` ("Side widgets"). **Open:** (a) the share price rides Yahoo's
  _unofficial_ chart endpoint (no key, no SLA, terms unclear) — fine for a side widget, but cache longer / drop it if it ever rate-limits or breaks, and don't build anything on it; (b) `stockCompanies.ts` covers 32 tickers —
  brands without a listed parent (or private groups) simply show nothing; (c) Bluesky shows whatever the keyword search returns (no relevance/spam filter beyond the opt-out label) — judge on real plates; (d) browser-check at
  ≥ 1400 px with the left sidebar open (overlap) and on the VIN / photo-result routes.
- ✅ **Skeleton placeholders** for stats pages and homepage stats (2026-10-06, `de0a53c`) and the **About page sources + icons** (`9b974fd`) — built, see `docs/plan-done.md`.
- ✅ **Weight rankings, Stack Exchange + Lemmy community posts, richer "Copy all info" export, WebP brand logos** (2026-10-09, `3f7a596` … `bb9f055`) — built, see `docs/plan-done.md` and `docs/features-reference.md`. **Open:** Stack Exchange / Lemmy are unauthenticated public APIs (rate limits unmeasured — judge on real traffic, drop the widget column if they throttle); weight edges for models with few vehicles are percentile-based, so tiny samples are noisy (per-group floor only); Lighthouse/LCP not yet measured after the perf pass (Phase 4).
- 📋 **"What's new" bell + feature guide** — planned 2026-10-06, not started: [FEATURES_PLAN.md](FEATURES_PLAN.md) (changelog bell, `/features` guide with Playwright screenshots, ua/ru/en). **Conflicts with the
  paid-features route** — see Phase 5 "Stage A".

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
  transport for Львів only; (b) YouTube ISS streams can be retired or embed-blocked — swap ids in `LIVE_STREAMS` (earth / traffic / city, `apps/web/src/lib/live-background.ts`; traffic/city streams added 2026-10-05).

### Test-drive racer game ("Free test drive" banner) — ✅ built (2026-10-08), follow-ups left

Built: a desktop-only promo banner beside the result card (xl+; a 🎮 circle on lg; eases in 3 s after the card shows) opens a pseudo-3D racer in a modal. Write-up, file map and gotchas: `docs/plan-done.md` "Test-drive racer game".

- ✅ (2026-10-09) Standalone **`/race`** route (no plate; random famous car + hardcoded presets per body type in `lib/racer/presets.ts`; HUD km odometer for the session) — see `docs/features-reference.md` "Test-drive racer".
- [ ] **Full screen + mobile (virtual buttons, tilt)** — researched, not started: `GAME_PLAN.md`.
- [ ] Optional **music**: the original's track is licensed to that project only (Lucky Lion Studios) — not reusable. A CC0/CC-BY loop would be a separate lazy download (~1-3 MB) behind the sound toggle, with a credit line in the modal.
- ✅ Credits (javascript-racer, Kenney, and the CC BY 4.0 Sketchfab authors: animanyarty, MaG80, JUFF, mk2design, snafuj, Houdini1561, Han66st, cgart.com) are in `about.source.racer`.
- ✅ Models (2026-10-08): sedan, hatch, sport, SUV, pickup, van and bus are now CC-BY Sketchfab renders; the owner's other candidates were rejected for licence (CC BY-NC / "Sketchfab Standard") or because the body can't be tinted — see docs/plan-done.md "Racer art pass".
- ✅ Start settings: scenery, backdrop, lanes, traffic and resolution are random on every opening; the HUD lap/last/best readout is hidden (speed only).
- [ ] **Art-pass leftovers** (details: docs/plan-done.md "Racer art pass"): (a) delete the unused Kenney `van.webp`, `van-l/-r.webp` and their `-mask` files from `lib/racer/assets/` once `pnpm dev` is stopped (Windows holds them open; keep `van-gmc*`); (b) verify in the game: moto steering direction, the per-category top speed, the sunset/night/winter washes on all four backdrops (bus, sedan, hatch, sport, SUV, pickup and van steering/plates are verified); (c) more models from the owner (tractor, tow truck, a better motorbike, replacements for the Kenney taxi/police/ambulance/fire/garbage specials): GLB, CC0 or CC-BY (never CC BY-NC / "Sketchfab Standard"), closed rear, separate body material; (d) roadside trees/signs are still generated; (e) tune bus/moto size and plate rects; (f) the backdrop ridges are mirrored, so the centre peak is symmetric — more photos or a wider crop would fix it; (g) the banner appears 3 s after the card (xl+ only) — confirm that is what the owner meant.
- [ ] Remember the sound choice and the last settings in localStorage (today: sound off every open; settings only via the share link).
- [ ] Touch/mobile controls — deliberately out of scope (desktop only, keyboard).
- [ ] Track variety / a second track, ghost of the best lap, a local top-N lap table.
- [ ] Count game opens in `app.usage_events` (new kind in `ROUTE_KINDS` + `USAGE_KINDS` + the `admin.stats.kind.*` i18n keys) to see whether the banner earns its space.

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

### Wikimedia hero-image cache in Postgres + pre-warm — ✅ built and fully pre-warmed (2026-10-06); small tail left

Pre-warm finished over every model (steps 1-7 done 2026-10-05/06; table 112,398 rows, seed CSV `scripts/seed-data/wiki-images.csv.gz`
2.0 MB); **62.8% of registered cars have a photo**. The result-card hero now loads through the photo-only
`GET /api/wiki/image` (stored row → live fallback → per-kind placeholder) and the Wikipedia text loads only when its section
is opened. Design, schema, runbook, run log and the endpoint write-up are in `docs/plan-done.md` ("Wikimedia hero-image cache
in Postgres + pre-warm").
**2026-10-09 — alias passes done (✅):** `packages/shared/src/wikiAliases.ts` (`wikiSearchName`) maps registry factory indexes / engine-code
names to searchable names (VAZ 21104 → VAZ-2110, Niva, Priora, Kalina, ZAZ Sens/Slavuta/Tavria, GAZ, UAZ, Geely MK, Mercedes
E-Class/ML/Sprinter, BMW "116 i" → 1 Series, trailing engine sizes stripped); rows keep the registry key, only the search uses the alias.
`pnpm ingest:wiki-images -- --aliased` ran 3 passes (447 + 752 + 919 models, 0 failures left). The coverage script had a whitespace
mismatch (registry `DAEWOO  LANOS`) and showed a false "33% not processed"; fixed. **Real coverage: 62.8% → 98.0% of cars** (13.10M;
266k cars / 2.0% still `not_found`, mostly tiny trim-code models like "307 xs 2.0 e"). No wider pre-warm is needed. Soviet/UA photo sites
(autoussr.ru, zaz.drive.place, sovietcarmodels.com, 24tv) were **not** used: copyrighted. Write-up: `docs/plan-done.md`.
**2026-10-10 follow-up (✅):** live fallback now uses `wikiSearchName`; ~40 new alias rules; `--aliased` stopped early (≈1,800/2,212 models); **coverage 98.0% → 99.0%** (126k cars still not_found). Details: `docs/plan-done.md`.
**2026-10-10 second session (✅):** `--aliased` finished, `--retry-failed` cleared, tail rules added (Doblo, Sorento, Mitsubishi, Peugeot trims, Geely LC/FC), diacritics fixed in title matching; **coverage 99.1%** (114.7k cars not_found), CSV re-exported. Details: `docs/plan-done.md`.
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

**Step 2a — infocar video crawl: done 2026-10-04; models with no video → YouTube fallback (ingest built 2026-10-05; daily runs + lookup/UI open).** Full crawl:
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

**Build status (2026-10-05): ingest built (steps 3, 4, 6-tooling, 7); real run in progress (day 3 done, see below); lookup integration done 2026-10-07 (`ReviewsService.lookup` falls back to `youtube_videos` through `videoLookup` when infocar has no video for the model; the Videos section needed no UI change, only the source footnote); the response video now carries `source` (infocar|youtube) + `lang`, the Videos section shows a "found by a YouTube search" note for fallback videos and lists the UI language first (`preferLanguage`, client-side — the API still caps at 6 newest, language-blind).**
**Run log:** `pnpm ingest:youtube-videos -- --min-cars 5000`, once per Pacific day (after ~10:00 Kyiv). Day 1 (2026-10-05): 67
models, 443 videos, 9,090 units, 0 errors; obscure ВАЗ trim codes fell through to 3 queries (303 units each), so fewer than the
~89 models/day estimate. Afterwards ВАЗ trim codes were folded into the base model (`baseModel`: 21063 → 2106, 210994 → 21099,
217030 → 2170; day-1 rows re-keyed, their run rows dropped), so the ≥5,000 tier is now 131 models with ~85 left (≈ 1 more
day). Day 2 (2026-10-06): 65 models with videos, 4 none (ЗАЗ 1102xx/1103xx), 0 errors, 459 videos, 8,988 units; daily budget
reached with 16 models left in the tier. Day 3 (2026-10-07): **≥5,000 tier finished** — 16 models with videos, 0 none, 0 errors, 112 videos,
2,222 units; the remaining budget went to `--min-cars 1000`: 44 models with videos, 5 none (ЗАЗ TF698K, Mercedes 200, Fiat NUOVO DOBLO,
Daewoo T13110, ЗАЗ 110307-40), 0 errors, 308 videos, 6,764 units (8,986 total); 194 of 243 models left in that tier (≈ 2 more days;
next in line: Mercedes-Benz ML 320 down to 3,033 cars). Day 4 (2026-10-08): `--min-cars 1000`: 50 models with videos, 5 none (Daewoo FSO LANOS TF69Y, ЗАЗ TF69YO, ЗАЗ 110377-40, …), 0 errors, 302 videos, 8,984 units; daily budget reached, 151 of 206 models left in that tier (≈ 1.5 more days; next in line: ≤ 2,254 cars). CSV re-exported (1,574 videos). Day 5 (2026-10-09, run after the 10:00 Kyiv reset; a first attempt at 09:10 found the quota still spent and did nothing): `--min-cars 1000`: 39 models with videos, 8 none (АЗЛК 2141201, заз-Daewoo T13010, Chrysler GR.VOYAGER, …), 0 errors, 221 videos, 9,080 units; daily budget reached, 104 of 151 models left in that tier (≈ 2–3 more days; next in line: ≤ 1,662 cars). CSV re-exported (1,792 videos). **First partial CSV seed committed 2026-10-06** (`a0b278a`: 881 rows over 110 models in the DB and the CSV; the per-day
sums above are 902 — the difference was not investigated). **Next:** run `--min-cars 1000` again after the quota reset (~2–3 days left, 104 models); when `done` reports nothing left, re-run `pnpm export:youtube-videos:csv`
and commit `scripts/seed-data/youtube-videos.csv.gz` again; then the lookup/UI integration, then `--min-cars 1000` (374 models, ≈ 3 more days).
Migration `0031_youtube_videos.sql` (`registry.youtube_videos` + `youtube_model_runs` resume/quota ledger),
`scripts/src/youtube-videos.ts` (+ `youtube-videos-filter.ts`, tested), CSV export/import wired into `ingest:ratings:csv`.
The target list is derived (`--list`): 5,142 passenger-car gap models; tiers by registered cars at ~101 units/model, ~89
models/day: ≥10,000 cars = 99 models ≈ 1.1 d · ≥5,000 = 164 ≈ 1.8 d · ≥2,000 = 299 ≈ 3.4 d · ≥1,000 = 435 ≈ 4.9 d ·
≥100 = 1,334 ≈ 15 d. So "1.5-2 days" buys the ≥5,000 tier (3.17M of the 4.15M gap cars); run `--min-cars 5000` first.
Known gaps: the same model under two brand spellings is searched twice (Daewoo/ЗАЗ LANOS); Cyrillic aliases exist only for
the curated table in `youtube-videos-filter.ts` (others need the Latin model name in the title); no generation matching yet.
Dry-run on 2 models (Lanos, Lancer): 8 kept each, 101 units each.

**Remaining (YouTube fallback) — the design, trial, language cascade, title filter and quota notes moved to `docs/plan-done.md`
("YouTube fallback for models with no infocar video — design, trial and build notes"):**

1. **Finish the runs:** the ≥ 5,000 tier finished 2026-10-07 (Day 3) and the ≥ 1,000 tier is started — keep running
   `pnpm ingest:youtube-videos -- --min-cars 1000` once per Pacific day until `done` reports nothing left, then re-run `pnpm export:youtube-videos:csv` and commit `scripts/seed-data/youtube-videos.csv.gz`; then `--min-cars 1000` (374 models, ≈ 3 days).
2. **Generation/year matching** — parse a year or generation word (`MK1`, `Mk2`, `B`, `3`, `X`) from the title and map it to a generation
   year range via the infocar version catalog (as `videoLookup` does for infocar videos), else store the title year.
3. ✅ _done 2026-10-07_ — **`videoLookup` integration + UI label** — `youtube_videos` as a second source after the infocar ones (dedupe by `youtube_id`, infocar
   first, `MAX_VIDEOS` still caps the section), labelled as YouTube search results rather than infocar picks.
4. **Verify** (the "Done when" below) and measure again: share of the top-400 pairs with ≥1 video (was 74.1% of registrations), share of
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

**Built:** RDW specs (the "Specs" block, stages C/C2/C3 + regroup) — `docs/plan-done.md` "RDW specs (EU / NL)". RDW recalls (stage D) and C4
(estimated value) are built (2026-10-09); stage E (Open EV Data, "Electric" block) is built too (2026-10-09; the upstream data is frozen at 2020); **next: stage F (NHTSA)**, only on the owner's "go stage F". Details, licences, URLs, caveats and the skip list:
`DATASETS_PLAN.md` ("Round 2"). Buildable (all free, own tables, each a
removable card block, credit on About): **RDW** registered vehicles (CC0; "Specs") + RDW recalls (CC0), **NHTSA** recalls +
complaints (public domain, live API like `api/safety`), **UK MOT** (OGL v3; "Common faults", newest file 2023), **Transport
Canada** recalls (OGL-Canada, low priority), **Open EV Data** (MIT; "Electric" block). Order: RDW -> NHTSA -> EV -> Canada -> MOT. **Refresh cadences** (RDW specs 6 mo, RDW recalls monthly, NHTSA live + cache
7/30 d, MOT yearly, Canada quarterly, EV quarterly) are in `DATASETS_PLAN.md`; **each source's ingest, seed, refresh command and
`SCHEDULE.md` entry are implemented only when its card block is built** — nothing ahead of the feature.
Recalls are model-level and market-labelled, never "your car has a recall"; this revisits the 2026-09-24 park in "Phase 3+ —
recalls" above (open owner call: NHTSA recalls or RDW/EU only). **Skipped:** Eurostat (country totals only), ANCAP / Latin NCAP /
ASEAN NCAP (no licence/permission), Kaggle sets, DVSA recalls API. Wikidata deferred. data.gov.ua is a separate session.

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
(2026-10-10): **no multi-car compare / duel / overlay** (skipped); no contact with the site owners.

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
- **Segment-peer list** — skipped with compare (it is a mini-compare).

**Group 2 — Euro NCAP (already ingested; improvements only)**

- State: `scripts/src/euroncap.ts` scrapes euroncap.com (sitemap discovery, 1 req/1.5 s, identifying UA, robots-aware) into
  `registry.euroncap_ratings`, committed as `euroncap-ratings.csv.gz`. **No licence/terms review is recorded** for it (the round-2
  sources each got one). **Terms read 2026-10-10 (`DATASETS_PLAN.md` "Euro NCAP terms"): not cleared** — content is copyrighted,
  commercial reproduction "not authorised", prior permission needed for text and multimedia. **Before deploy: stars + percentages +
  source link only; drop images/videos/logos and copied wording unless Euro NCAP permits.**
- Ideas: stars + the four percentages (adult / child / vulnerable road users / safety assist) in the spec summary; test year and
  protocol badge ("2012 results, older protocol — not comparable to current stars"); link every star line to the source page.

**Group 3 — more open sources (already in DATASETS_PLAN, order unchanged)**

- NHTSA recalls + complaints (stage F, owner call pending), UK MOT "common faults" (OGL, newest file 2023), Transport Canada recalls
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

The recurring-job plan (cadences, locking, run log, alerting, build steps) is drafted in [SCHEDULE.md](SCHEDULE.md) — build it as part of this phase.

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

- ✅ Load-performance pass done 2026-10-09 (lazy sections, per-language i18n, chunk groups — `docs/plan-done.md` "Load-performance pass").
  **Remaining load-performance actions (value order; context in "Load-performance pass"):**
  1. [ ] Measure for real — Lighthouse + DevTools trace on the VPS behind Caddy (Fast 4G, 4× CPU); LCP/CLS before vs after were never measured.
  2. [ ] Preload the active language chunk (it is fetched only after the entry script runs: one extra round trip) — inline script in `index.html` + a build-time hook for the hashed filename.
  3. [ ] Brotli at the proxy (Caddy `encode zstd br gzip`) — the API does not compress; local numbers overstate transfer.
  4. [ ] Short-TTL edge cache for read-only `/api/*` lookups (stats, vdb, rdw, wiki) — see `docs/vps-http2-http3.md`.
  5. [ ] Make `FuelEconomy` / `RdwSpecs` lazy for real: move the helpers they share with `CO2Badge` and the VIN code into the grouped helper chunks in `vite.config.ts`.
  6. [ ] Hero/LCP: confirm the largest image is the hero and add a preload hint; check fonts.
  7. [ ] Delay PostHog extras (recorder, surveys, dead-clicks, web-vitals scripts) until idle / first interaction (telemetry is off locally).
- HTTP/2 + HTTP/3 + Brotli + caching setup: [docs/vps-http2-http3.md](docs/vps-http2-http3.md) (open UDP 443!)
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
- **Email + password:** `credentials` table (argon2id), email confirmation, forgot/reset password (single-use hashed
  tokens, 1 h TTL), change password, session list/revoke, login throttle 5/15 min per email + 20/15 min per IP (see
  rate-limit section). Needs a transactional email provider (Resend/Postmark/Brevo free tiers; Brevo or SES if cost
  matters), SPF/DKIM on the domain, and email templates (ua/ru/en). Prefer Better Auth over hand-rolling this part.
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
