# Leftovers - what is still open

Triage of the owner's old checklist (the `+ implemented / - todo / -? skip` list) against PLAN.md and the code, 2026-11-02.
Ask "what is left?" -> read this file first. Details live in `PLAN.md` (backlog) and `docs/plan-done.md` (write-ups).
Sections 1-3 are the triaged to-do list; section 4 maps open items that stay in their own plan files; section 5 is what not to redo.
Keep it short: when an item ships, delete it here and add the ✅ line to PLAN.md as usual. Do not copy text from other plans here, link to them.

## 1. Next up (ready, no blocker)

- [ ] **Fix stale PLAN.md text** - "Own ALPR + AR overlay" said steps 2-4 not started, but `ArCameraDialog.tsx` exists (header fixed 2026-11-02; the "Phase 2/3" wording may still lag).
- [ ] **Label more ALPR eval photos** - 3 of 88 are labelled in `services/alpr/eval/labels.csv`; `ALT_CONFIDENT_*` / `ALT_MIN_SCORE` stay untuned until more are. Two photos (`BX5213BO`, `BC3064XC`) are missing from `eval/images/`.
- [ ] **ALPR UI checks** - light theme, desktop, moped and truck photos end to end, the registry re-rank run against the real registry (only unit tests today).
- [ ] **Telegram bot** (PLAN.md "To discuss / research") - build after the audience check in `docs/discovery-plan.md`; about 1 day.
- [ ] **Alarm layer: history ingest** from the MIT siren dataset needs no key - can start before the Ukraine Alarm key (`docs/alarm-plan.md`).
- [ ] **`/stats` diagrams** - treemap, heatmap, year histogram (PLAN.md "Visual stats" step 6; data already exists).
- [ ] **Enforce the CSP** - Report-Only now; switch after ~1 week of clean reports (PLAN.md "Deploy-time security checklist").
- [ ] **Favorites** - filter chips by label, unique (case-insensitive) label names, server-side cap on `labels`.
- [ ] **Stats edge-cache checks** - browser load of `/stats`, cold vs warm timing, cron-lag note (PLAN.md `STATS_CACHE`).
- [ ] **Dependabot** - merge #65, close #66-#69 (Nest 12 / TS 6 pinned), bump the `pnpm audit` findings.
- [ ] **Catalog year pages** (block 4) - check Search Console about 2026-11-13; build only if the first 300 pages are indexed.
- [ ] **Run the security hardening plan** - phases B-D: CSP report sink + enforcement, HSTS and origin-header fallback, cadence (`docs/security-checklist.md`, `docs/pentest-lab.md`).

## 2. Research / maybe later

- [ ] **Social search widgets** (Facebook, TikTok, Threads, Instagram) - checklist said researched, but no write-up exists. Write down the decision, or research now (Bluesky is the model).
- [ ] **Drive2 country filter** (Lithuania, Belarus ..., exclude Russia) - no trace in the plan; research whether possible.
- [ ] **Cookie consent** - analysis is in `docs/legal-and-monetization.md`; decide before any ads go live.
- [ ] **OBD fault-code lookup page** - open code lists; one new public route (route checklist in CLAUDE.md).
- [ ] **More login providers** - GitHub, Microsoft, Facebook; also passkeys, "add email" on `/profile`, notification opt-out for the new-device mail.
- [ ] **Driver's-licence-style plate card** - never started; low value.
- [ ] **Brand pronunciation** (ua/ru/en audio) - never started; low value.
- [ ] **Game** - remember sound/settings in localStorage, count opens in `usage_events`, CC0 music loop, tilt steering.
- [ ] **Lviv GTFS-Realtime layer** - licence unchecked.
- [ ] **e-Ukraine typeface for share cards** - blocked on licence.
- [ ] **Speed round** - composite index `(brand, model, make_year)`, `EXPLAIN` on other filter combinations (PLAN.md items h-j).
- [ ] **Market-index chart / bond charts** in the share-price section.

- [ ] **Ideas checklist (generic "features to add" list, checked 2026-11-02) - genuinely missing:**
  - Maintenance schedules (service intervals by make/model/year) - no free source found; only MOT faults and common faults exist.
  - Insurance cost data - only a link-out to `policy.mtsbu.ua` (policy validity check); average cost needs a paid or no-source dataset.
  - Parts compatibility / cross-references - researched, paid only (TecDoc, MOTOR); skip.
  - Batch recognition of several uploaded images in one go - one photo with many plates works, a multi-file upload does not.
  - Public "most searched makes/models" - `usage_events` feeds the admin page only; registry-based Top 5 exists on home and `/stats`.
  - Accident/total-loss history - only link-outs (auction and Asia history sites), no data.
  - Reliability score per model - parts exist (RDW/UK MOT fail rates, recalls, complaints), no combined score.

## 3. Blocked on someone else

- automobiledimension.com - owner's permission (asked 2026-10-07).
- cars.ua listing status - letter sent 2026-11-01; fallback is the Autocars dealer letter.
- Air-raid alerts - Ukraine Alarm API key.
- RIA "similar cars" / average price - `developers.ria.com` key.

## 4. Open items that live in other files (cross-reference, not copied)

Each file stays the source of truth; this table is only the map. Check the file's own "Next" / "Still open" part before starting.

| Area            | What is open (one line)                                                                                                                                                                                                                                                  | Where                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Ops / deploy    | Healthchecks.io secrets per ingest job, first-month cron check, enforce CSP, account-deletion test, fresh Contabo snapshot before risky changes                                                                                                                          | `SCHEDULE.md` (items 5-6), `docs/deploy.md` "Still open"                |
| Security        | Hardening plan findings; pre-launch checklist (audit, trivy, headers, CSRF and rate-limit probes); Sentry events and 429-spike alert                                                                                                                                     | `docs/security-hardening-plan-2026-11.md`, `docs/security-checklist.md` |
| Growth / SEO    | Directories (Product Hunt, AlternativeTo), data.gov.ua forum post, press/About facts page, open stats download, embeddable "check a plate" badge, shorten long `/read/*` titles                                                                                          | `docs/discovery-plan.md`                                                |
| Air-raid alerts | Steps 1-6; history ingest needs no key                                                                                                                                                                                                                                   | `docs/alarm-plan.md`                                                    |
| Auctions        | Garpun/SETAM: price check line, "was at auction" in the owner timeline, `/auctions` About mention and sitemap check, direct lot link (skipped, terms); foreign auction open data later. (Prozorro.Sale is done; only a conditional photo-copy idea remains in its plan.) | `docs/garpun-auctions-plan.md`                                          |
| Catalog         | Year pages (block 4), "Done and left" list                                                                                                                                                                                                                               | `docs/catalog-plan.md`                                                  |
| Compare         | Open: pictures and new blocks in docx/pdf, tray outside the catalog, indexable pairs, `GET /api/compare`, `/read` embeds                                                                                                                                                 | `docs/compare-plan.md`                                                  |
| Data sources    | Other countries (J, revisit only on request), a few unmatched Wikipedia models, region-less codes `DC` / `PD` untested                                                                                                                                                   | `DATASETS_PLAN.md`                                                      |
| Origin          | Follow-ups list                                                                                                                                                                                                                                                          | `ORIGIN_PLAN.md`                                                        |
| Skipped plans   | Feature guide tour (skipped 2026-10-31; `/features` route clash) and game plan                                                                                                                                                                                           | `FEATURES_PLAN.md`, `GAME_PLAN.md`                                      |
| Legal / money   | Consent and licence decisions before ads                                                                                                                                                                                                                                 | `docs/legal-and-monetization.md`                                        |
| cars.ua         | Waiting for a reply                                                                                                                                                                                                                                                      | `PLAN.md` "cars.ua listing status"                                      |

## 5. Closed on purpose (do not redo)

- Paid or token-gated: Platesmania (free-key letter sent 2026-11-07, awaiting reply: see PLAN.md Phase 3), Copart / bid.cars history, auction-api.app, RIA paid services, NICB-style crash data.
- Researched, nothing to build: average fuel price (a95 licence), distributor price scrapers, extra NHTSA vPIC endpoints, RU/BY/Baltic databases, Window sticker.
- Replaced: Twitter widget -> Bluesky, news bell -> `/releases`, plate-free model pages -> `/cars` catalog, Dutch recall translation -> live translation.
- Research only, nothing started: carsized / autosize (PLAN.md "Spec-page ideas").
