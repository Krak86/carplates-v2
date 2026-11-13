# Privacy / GDPR compliance: research and step plan

Researched 2026-11-13. **Not legal advice.** Decision taken: **cookieless analytics, no consent banner**. Tick the boxes below as each step lands.
Related: `docs/legal-and-monetization.md` ("Cookie / consent"), `docs/deploy.md` ("Backups", "Restore from R2"), `docs/features-reference.md` ("Accounts").

## Context

Hosting is a Contabo VPS in Germany behind Cloudflare, with R2 for backups and shared photos. The UI is en/ru/ua, so EU visitors are expected.
GDPR applies because we serve people in the EU, not because the server is in the EU. Ukraine's Law 2297-VI also applies (the GDPR-style
reform, bill 8153, is not enacted as of the last sources found; re-check on rada.gov.ua).

## Findings

### Do we need a cookie banner? No, if nothing non-essential is stored on the device

ePrivacy Art. 5(3) needs consent for storing or reading anything on the device unless it is strictly necessary. The 2025-26 Digital Omnibus
talks kept this in Art. 5(3) (consent still required, a few narrow exemptions added); the final text was not confirmed, so re-check.

| Item                                                                                                      | Where                                      | Needs consent?                                              |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `carsua_sid` session cookie (30 days sliding, HttpOnly)                                                   | `apps/api/src/auth/session-cookie.ts`      | No, strictly necessary                                      |
| `carsua_did` device cookie (400 days, set at sign-in, outlives logout)                                    | same                                       | No (security / new-device mail), but disclose it            |
| `carplates.*` localStorage, IndexedDB (history, favorites, compare, offline cache), service worker caches | `apps/web/src/store`, `lib/*-db.ts`        | No, user-requested features                                 |
| **PostHog** `ph_*` cookie + localStorage, autocapture and replay on by default                            | `apps/web/src/lib/telemetry.ts`            | **Yes, this is the only blocker**                           |
| Disqus (sets cookies)                                                                                     | `routes/DiscussRoute.tsx`                  | Gate behind a click                                         |
| OpenStreetMap iframe, auto-loads                                                                          | `components/RegionMap.tsx`                 | Leaks IP to a third party; gate behind a click              |
| YouTube (nocookie), Google Maps, Sketchfab, carshow360                                                    | modals                                     | Already click-to-open                                       |
| Google Maps "Nearby services" iframe, live-background map / stream iframes                                | `NearbyServices.tsx`, `LiveBackground.tsx` | Click / user setting, **except shared links** (see Step 2b) |
| Turnstile, Google / Telegram sign-in                                                                      | loaded when the user acts                  | Necessary                                                   |
| Cloudflare `__cf_bm` (Bot Fight Mode)                                                                     | edge                                       | Security, exempt                                            |

No IPs are stored in the DB (`usage_events` has no IP / user id). `app.sessions.user_agent` (300 chars) and `known_devices.device_hash` are stored.

### Best practice chosen

Make analytics cookieless instead of adding a banner. PostHog's `cookieless_mode: 'always'` writes nothing to cookies, localStorage or
sessionStorage and counts visitors from a daily-rotating server-side hash. It needs the project setting "Enable cookieless tracking"
(Settings > Project > Web analytics). Person-level features (`identify`, replay) do not work in this mode. Verify option names against the
pinned `posthog-js` version. If a banner is ever needed (ads, replay), use `vanilla-cookieconsent` v3.1.0 imported lazily.

### PostHog EU

Production uses the US cloud (`features-reference.md:223`); the code default is EU. A project cannot be switched between regions: create a
new organisation at eu.posthog.com (EU cloud has a free tier), start fresh, keep the US project until it is not needed, then delete it.
Historical migration is limited on free plans (a support ticket may help). Re-check PostHog's current docs before acting.

### Deletion and backups: what is normal

- GDPR: erase "without undue delay", answer within 1 month (extendable). Large sites take 30-90 days including a recovery window.
- Backups: the ICO accepts putting backup data "beyond use" until it rotates out; the CNIL accepts not editing backups if you disclose the
  retention and never restore erased data; the Danish authority wants deletion "where technically possible". A short rotation covers all of
  them. Rules: disclose the retention, use backups only for disaster recovery, let them expire, and **re-apply deletions after a restore**.
- Current state: 14-day grace period + 6-hourly purge (`account-purge.service.ts`, cascade over `app.*`) is fine. Nightly dumps rotate at
  14 days, fine. **Problem 1:** `backup.sh full` dumps the whole DB including `app.*` and keeps the newest 2 (monthly), so a deleted user can
  live about 2+ months while the Privacy page says 14 days. **Problem 2:** after a restore, accounts purged after the backup was taken come back.
- Target: account data lives at most 14 days (grace) + 14 days (nightly rotation) = 28 days.

### Legal pages vs code (mismatches found)

1. `legal.privacy.device.p`: says history and favorites "never leave your device"; signed-in users sync them to `app.user_saved_entries`.
2. `legal.privacy.account.p`: no email sign-in, no user-agent / device hash, no `lang` / marketing opt-in / synced settings / digest log.
3. Says "ask us to delete"; deletion is self-service at `/profile` with a 14-day grace period that any sign-in cancels.
4. Says backups are kept 14 days; full dumps keep 2 ingests.
5. No controller identity, legal bases, cookie list or retention table. The only identity shown is "carsua.app".
6. `about.p2` says "vehicles and their owners" while `privacy.registry.p` says no owner data (the registry has `person` and a KOATUU address code, no names).
7. `account.delete.*` dialog omits synced favorites, history, settings and shared photos.
8. `PLAN.md` "Backup policy" still says "No nightly job" (outdated).

## Retention table (to publish)

| Data                                 | Kept                                                |
| ------------------------------------ | --------------------------------------------------- |
| Sessions                             | 30 days sliding, deleted on logout / account delete |
| Email sign-in codes                  | 1 day after expiry                                  |
| Sync tombstones                      | 30 days                                             |
| Shared photos                        | 7 days (original upload within 1 hour)              |
| Deleted account                      | 14-day grace, then hard delete (cascade)            |
| Backups                              | up to 14 more days (after Step 3)                   |
| Processors (PostHog, Sentry, Resend) | their own policies; link them                       |

## Steps (each separate and committable; stop for review after each)

### Step 1. Cookieless PostHog, no banner (`apps/web/src/lib/telemetry.ts`)

- [x] `posthog.init`: `cookieless_mode: 'always'`, `persistence: 'memory'`, `autocapture: false`, `disable_session_recording: true`,
      `disable_surveys: true`, `capture_dead_clicks: false` (check names against the installed version; ask before bumping the pin)
- [x] Unit test the init options (mock `posthog-js`): `apps/web/src/lib/telemetry.test.ts`
- [x] After deploy: enable "Enable cookieless tracking" in the PostHog project (done 2026-11-13, EU project 348169; project-level autocapture / heatmaps / web vitals switched off)
- [x] After deploy (done 2026-11-13; verified: events go to eu.i.posthog.com, no `ph_*` cookie or localStorage key): create the PostHog EU org, set `VITE_POSTHOG_HOST=https://eu.i.posthog.com` + new key (GitHub vars, `deploy-web.yml`),
      point the server HogQL key/host (`apps/api/src/usage/posthog.service.ts`, `env.ts`) at EU, update `features-reference.md:223`
- Sentry stays (query strings stripped, no device ids); disclose it.

### Step 2. Click-to-load embeds

- [x] `RegionMap.tsx`: placeholder + "Show map (OpenStreetMap)" button before the iframe (local `useState`)
- [x] `DiscussRoute.tsx`: "Load comments (Disqus sets cookies)" button before the embed
- [x] ua/ru/en strings (no em dash in UI text); component tests: no iframe before the click

### Step 2b. Embeds that can load from a shared link without a click (done: gated)

- `NearbyServices.tsx:30-31`: `?section=nearby` opens the section on load (`isSharedNearby`), so the Google Maps iframe (`nearbyEmbedUrl`,
  `lib/maps.ts`) loads and the visitor's IP goes to Google without a click. Normal use is click-to-open.
- `LiveBackground.tsx`: map (`maps.google.com/...&output=embed`) and stream (YouTube etc.) iframes load from the saved layout; a shared layout
  URL (`useLayoutUrl.ts`, `ShareLayoutButton.tsx`) may set the mode without the visitor choosing it. **Verified:** a URL alone turned it on (`useApplyLayoutFromUrl` called `setMode`). Now map/stream links only ask (`SharedLayoutPrompt.tsx`); alarm layer is our own API, not gated; a signed-in user's own saved default layer still loads directly.
- [x] Decide with the user (decision: gate): require a click for shared links (placeholder + "Show map (Google Maps)" button, same pattern as `RegionMap.tsx`),
      or accept and disclose Google as a processor
- [x] If gating: `NearbyServices.tsx` (shared link shows the placeholder, the header click or the button loads the iframe), `LiveBackground.tsx`
      (shared layout asks before loading a third-party iframe), ua/ru/en strings, tests: no iframe before the click
- [ ] Either way: list Google Maps and YouTube in the Step 4 processors / device-storage sections

### Step 3. Backups: cap account data at 14 days (`infra/vps/backup.sh`)

- [x] `full` mode: `--exclude-schema=app` (full has no `-t`, so the exclude works); update the header comment
- [x] `docs/deploy.md` "Restore from R2": restore latest `full`, then latest `nightly`; run the deletion replay after
- [x] Deletion ledger: on purge write the user UUIDs (no PII) outside the DB (R2 `deleted/<uuid>`, reuse the shares R2 client); a small
      `infra/vps/restore-replay-deletions.sh` deletes those ids from `app.users` after a restore; prune entries older than 14 days (the ledger lives in the shares bucket under `deleted/`; written by `AccountPurgeService`, ledger first, rows kept if the write fails)
- [x] After deploy (done 2026-11-13: ledger connection checked, new app-free full dump 1.74 GB, old dump deleted): run `deploy-api` (syncs the replay script, writes the LEDGER remote), a 15-day lifecycle rule on `deleted/`, and scope the existing 8-day rule to `shares/`; the next `backup.sh full` then excludes `app`; delete the old full dumps that still contain it (R2 `full/`) once a new one exists
- [x] Test the ledger write; fix `PLAN.md` "Backup policy"

### Step 4. Legal pages rewrite (ua/ru/en)

Files: `apps/web/src/routes/LegalRoute.tsx` (section ids, line 10), `en.json` / `ua.json` / `ru.json`, `AboutRoute.tsx`.

- [ ] New Privacy sections: controller (**user decides what identity to show**), registry / scraped data (sources, legal basis, objection
      via `/contact`), device storage + cookie table, account data per provider, retention table, processors and transfers
      (Contabo DE, Cloudflare, Resend, PostHog EU, Sentry, Google, Telegram, Disqus), rights (portability "on request" since export is not built;
      authority: Ukrainian Ombudsman or the EU DPA)
- [ ] Processors list must include Google Maps (nearby services, live background) and YouTube (streams), and say embeds load only on a click
      (or as decided in Step 2b)
- [ ] Cookie table: also list what a DevTools check on carsua.app showed (2026-11-13): `cf_clearance` (Cloudflare challenge, security), `g_state` (Google sign-in), and third-party cookies from Google (`NID`, `__Secure-STRP`, `SEARCH_SAMESITE`) and Telegram (`stel_ssid` on oauth.telegram.org / t.me). **Verify first** in a fresh private window, signed out, that Google / Telegram sign-in scripts load only when the sign-in dialog is opened and not on every page load; if they load on page load, gate them behind the click
- [ ] Fix `about.p2` ("and their owners") and `privacy.device.p`; update the `account.delete.*` dialog and `legal.updated`
- [ ] Follow `docs/checklists.md` ("Docs after a feature", "App version")

### Step 5. Account-deletion test (needs the user: throwaway account + VPS DB access)

- [ ] Sign in with a throwaway email account; add a favorite, a setting, a shared photo; note `users.id`
- [ ] Delete at `/profile`: cookie cleared, `app.sessions` empty, shared photo row + R2 object gone, email received
- [ ] Sign in again: `deletion_scheduled_at` cleared (restored)
- [ ] Delete again, set `deletion_scheduled_at = now() - interval '15 days'` for that id only, restart the API or wait 6 h: counts across every
      `app.*` table are 0 and the ledger object exists
- [ ] Record results here; close the gate in `docs/security-checklist.md:158` and the open item at `docs/deploy.md:322`

### Step 6. Docs / release

- [ ] `releases.ts` version + entry; `plan-done.md`; `PLAN.md` / `docs/leftovers.md:27` ticked; `features-reference.md` (Accounts, telemetry);
      `legal-and-monetization.md` "Cookie / consent" updated to the final state

## Sources

- [Digital Omnibus / ePrivacy status](https://www.heuking.de/en/news-events/newsletter-articles/detail/cookie-consent-under-the-digital-omnibus-planned-changes-and-technical-implementation.html)
- [Erasure vs backups (summary)](https://sota.io/blog/gdpr-right-to-erasure-backup-retention-logs-developer-compliance-2026) - secondary source; check ICO / CNIL pages directly
- [PostHog cookieless tracking](https://posthog.com/docs/product-analytics/cookieless-tracking)
- [PostHog EU migration](https://posthog.com/docs/apps/replicator)
- [vanilla-cookieconsent](https://npmjs.com/package/vanilla-cookieconsent)
- [Ukraine bill 8153 status](https://www.theworldlawgroup.com/membership/news/news-ukraine-moving-toward-gdpr-size-penalties-key-takeaways)
