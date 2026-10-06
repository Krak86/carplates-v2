# FEATURES_PLAN.md — "What's new" bell + `/features` guide

Planned 2026-10-06, **not started**. Self-contained so it can be picked up later. Decisions already made with the user:

- Screenshots: **Playwright script, committed WebP images** (`public/guide/…`).
- First slice: bell + changelog + guide skeleton + the search sections; the other groups follow in later slices.
- Route: **`/features`** (guide), changelog as a tab at `/features/changelog`; sharable via `?lang=` / `?theme=` / `#anchor`.

## Goals

1. Bell icon with an unread-count badge in the top header. Click → popover with the latest "new feature" entries + link to the guide.
2. `/features` route explaining **every** feature briefly, in ua/ru/en, light/dark, with screenshots per lang × theme.
3. Dynamic page, split by section groups so nothing loads at once. Disabled/notice when offline.
4. Sharable URLs per group/feature, with a language (and theme) example.

## Architecture (research conclusions)

| Topic             | Decision                                                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content source    | Typed registry `apps/web/src/features-guide/registry.ts` (`FEATURE_GROUPS`, `FEATURES`, `CHANGELOG`). One feature = id, group, i18n key, optional `shot` id, optional demo URL. No MDX/markdown lib (text is trilingual and links into the app).            |
| i18n              | Guide strings in **separate lazy JSON** per lang (`i18n/guide/{ua,ru,en}.json`, added with `i18n.addResourceBundle` when `/features` mounts) so the 3 main bundles don't grow by ~200 keys each. Bell/nav strings stay in the main files.                      |
| Lazy loading      | One `lazy()` chunk per group; a group renders only when its placeholder nears the viewport (`IntersectionObserver`, `rootMargin: 600px`). Images `loading="lazy"` + `decoding="async"` + fixed aspect-ratio to avoid layout shift.                              |
| Navigation        | Sticky table of contents (chips on mobile). `/features/:group` opens/scrolls that group; `#feature-id` anchors scroll to one feature. Group list = sections of the page; no per-group page reload.                                                          |
| Sharing           | `/features/search?lang=en&theme=dark#photo-zoom`. `?lang=` already supported (`i18n/index.ts`). Add `?theme=` handling (same non-persisted pattern as `?lang=`). No per-feature copy buttons — plain `#anchor` links only.                                 |
| Link previews     | Add `/features` (+ `/features/changelog`) to `STATIC_PAGES` in `apps/api/src/spa/spa-text.ts` (test requires all 3 langs).                                                                                                                                   |
| Offline           | `/features` itself is a tiny shell; images are online-only. When offline show a notice instead of the content (reuse `useOnlineStatus`, like `LayersButton`). Do **not** add to `lib/offline-cache.ts`. The service worker must not precache `public/guide/**`. |
| Bell state        | Zustand `ui-store`: `lastSeenChangelog` (ISO date or entry id) in localStorage, selector-only access. Count = `CHANGELOG` entries newer than it. Opening the popover marks all seen after ~1 s (or via "mark all read").                                     |
| Changelog content | Static `CHANGELOG` array (`{ id, date, titleKey, descKey, link }`), seeded from `git log --format='%ad %s'` feat commits (Sep 22 → Oct 6). No API/DB. Manual entry on every future feat commit (add to CLAUDE.md Workflow).                                  |
| Screenshots       | `playwright` devDependency in `scripts/`; `pnpm guide:shots` loops lang(3) × theme(2) × shot list, sets `localStorage` (`carplates.lang`, `carplates.theme`), clips the target element, writes `apps/web/public/guide/<lang>-<theme>/<id>.webp` (sharp, q≈80, ≤900px wide). Shot list = `scripts/guide-shots.config.ts`, derived from registry `shot` ids. |

## Test data (for screenshots and manual verification)

- Plate: **АА2463YD** (with its VIN, to be looked up in the local real-data DB; confirm the row exists before the run — if the DB holds only the synthetic seed, ask first, don't re-seed).
- Plate photo: any image from the user's `cars_plates` folder; VIN photo: from `car_vins`. **Those folders were not found** under `c:\VSCode\Krak86` (searched 4 levels) — user to provide the path or drop images in `scripts/guide-fixtures/` (gitignored if large; commit 2–3 small ones the shot script needs).
- Prerequisites for the run: `pnpm db:up`, real data ingested, `pnpm ingest:ratings:csv` (ratings, fuel, 3D/360, videos, press all appear in the shots), `pnpm dev` or built SPA via API, ALPR container up (`pnpm alpr:up`) for photo recognition shots.
- AR scan: needs a camera → Playwright fake media (`--use-fake-device-for-media-stream --use-file-for-fake-video-capture=<y4m/mjpeg of a plate>`); fall back to a manual screenshot if flaky.

## Content outline (feature groups → sections)

Info only: label + 1–3 sentences + screenshot. Describes the copy/export/`?` features; does not reproduce them, no "try it" or copy-link buttons.

1. **Search** *(slice 1 — plate first)*
   - Search by plate: normalization, Latin/Cyrillic homoglyphs, multiple plates in one query, example АА2463YD.
   - Search by VIN (short pointer; full section in group 3).
   - Search by photo / attach image: `PhotoSearchButton`; recognition result, many plates per photo, candidate list.
   - Photo viewer: zoomable (`PhotoZoomDialog`, pinch/wheel), plate rectangles can be hidden (`PhotoPlateBoxes` toggle), warnings/metadata.
   - Camera capture + zoom control (`CameraCaptureDialog`, `CameraZoomControl`).
   - AR scan: live detection (`ArCameraDialog`, `ArCameraSettings`, `ArPlateCard`).
   - VIN photo search (barcode + OCR, `VinSearchButton`).
2. **Plate result card** *(slice 1)*
   - Header, plate segments & plate explainer (`PlateSegments`, `SegmentExplainer`): series, region, `DІ/ЕD` online series, 2026 "no plate" rows keyed by VIN.
   - **Copy buttons** — plate / VIN / field-level (`CopyButton`, `CopyAllInfoButton`).
   - **Export to many formats** (`ExportMenuButton`, `LocalRecordsExportButton`): list the actual formats from the code.
   - **`?` info buttons** (`FieldInfoButton`, `InfoPopover`, `SectionInfo`): a short explanation per field; the **red `?` icon** opens the list of data behind a section (sources/fields). Verify exactly which icon is red and what it lists before writing.
   - Toggleable sections and their tabs (list each from `ResultCard.tsx`: registration timeline, region map, safety ratings with Euro NCAP/JNCAP/C-NCAP/KNCAP/IIHS/NHTSA tabs, fuel/CO2, reviews with infocar/TopGear/press/e-drive tabs, videos, news, wiki info, nearby services, verification links…).
   - Statistics chips (`TopStatBadges`), **360° chip** (`Model360Button`), **3D chip** (`Model3dButton`), hero photo (`WikiHeroImage`), photo gallery, card tilt toggle, favorites star, share button.
3. **VIN result** *(slice 1)*
   - `VinResult`: **decode with 2 tabs** (NHTSA decode vs. registry match — confirm exact tab names), grouped items (`VinDecodeFields`, `vin/`), what the "≈ registry" badge means, which sections are reused from the plate card and which differ.
4. **Advanced search** *(slice 2)* — filters, results, link to cards.
5. **Header layers** *(slice 2)* — `LayersButton`/`LayersPanel`: city map, NASA/ISS streams, traffic/city streams; poor-connection guard; hidden offline.
6. **History & Favorites** *(slice 2)* — local records, export, offline pinning of favorites (`OfflineDataSettings`).
7. **Stats routes** *(slice 2)* — `/stats` (map, tables, top lists), `/fuel`, `/safety`, one short card each + what each filter does.
8. **Widgets** *(slice 3)* — news ticker/widget/archive (`/news`), Bluesky posts, share-price widget, brand-channel videos, side-widget scroll gating, the logic behind each (sources, refresh cadence).
9. **App-level** *(slice 3)* — 3 languages, light/dark, background modes (`BackgroundDevPanel`/`LiveBackground`), PWA install + offline, content-width setting, link previews/share, About & sources, Discuss.

## Tasks, estimates, order

Info-only route: a feature = label + 1-3 sentences + screenshot. No copy-link buttons, no "try it" links, no re-implemented widgets. The registry is plain data rendered by one generic `FeatureBlock`; Claude drafts the text (user reviews ua/ru wording) and the script generates the screenshots. Estimates are working time with Claude doing the typing.

### Slice 1 — bell, changelog, skeleton, search sections (≈ 1–1.5 days)

| #   | Task                                                                                                                                  | Est.  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1.1 | `CHANGELOG` data + `NewsBellButton` (badge, popover, mark-seen in `ui-store`, 3 langs) + header slot + count test | 2–3 h |
| 1.2 | `/features` shell: registry, TOC, lazy group chunks + `IntersectionObserver`, offline notice, sidebar link, `STATIC_PAGES`, `?theme=` | 2–3 h |
| 1.3 | Guide text for groups 1–3 in ua/ru/en (~80 strings x 3, lazy i18n bundles)                                                            | 2 h   |
| 1.4 | Screenshot script (Playwright, lang x theme matrix, WebP) + shots for groups 1–3 + fixtures                                           | 3–4 h |
| 1.5 | QA (mobile, dark/light, offline), lint/type-check/tests, commit message                                                               | 1 h   |

### Slice 2 — advanced search, layers, history/favorites, 3 stats pages (≈ 0.5–1 day)

Text + shot-list entries only; the pipeline already exists.

### Slice 3 — widgets, app-level (≈ 0.5 day)

**Total ≈ 2–3 days** (Slice 1 alone is shippable). The slowest part is getting stable screenshots (seeded data, AR camera, scroll-gated widgets), not the page itself.


## Risks / open items

- `cars_plates` / `car_vins` photo folders not located — need path or files (see test data).
- Confirm АА2463YD exists in the local DB and which VIN it maps to; shots depend on real data (ratings, 360/3D, videos).
- Screenshots go stale as the UI changes → re-run `pnpm guide:shots`; consider a CI check later (Phase 4). Image weight ~5–15 MB in the repo; if too big, move to a CDN/gitignored-generated step at deploy.
- AR camera shot via Playwright fake video may be flaky.
- Wording accuracy: every claim must be checked against the component (formats list, red `?` icon, VIN tab names) at write time, not from memory.
- Guide i18n key additions must keep the three languages in sync (add a test comparing key sets of `i18n/guide/*.json`).
- Changelog needs a manual entry per feature commit — add a line to CLAUDE.md Workflow when implemented.
