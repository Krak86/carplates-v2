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
- [x] Either way: list Google Maps and YouTube in the Step 4 processors / device-storage sections

### Step 3. Backups: cap account data at 14 days (`infra/vps/backup.sh`)

- [x] `full` mode: `--exclude-schema=app` (full has no `-t`, so the exclude works); update the header comment
- [x] `docs/deploy.md` "Restore from R2": restore latest `full`, then latest `nightly`; run the deletion replay after
- [x] Deletion ledger: on purge write the user UUIDs (no PII) outside the DB (R2 `deleted/<uuid>`, reuse the shares R2 client); a small
      `infra/vps/restore-replay-deletions.sh` deletes those ids from `app.users` after a restore; prune entries older than 14 days (the ledger lives in the shares bucket under `deleted/`; written by `AccountPurgeService`, ledger first, rows kept if the write fails)
- [x] After deploy (done 2026-11-13: ledger connection checked, new app-free full dump 1.74 GB, old dump deleted): run `deploy-api` (syncs the replay script, writes the LEDGER remote), a 15-day lifecycle rule on `deleted/`, and scope the existing 8-day rule to `shares/`; the next `backup.sh full` then excludes `app`; delete the old full dumps that still contain it (R2 `full/`) once a new one exists
- [x] Test the ledger write; fix `PLAN.md` "Backup policy"

### Step 4. Legal pages rewrite (ua/ru/en)

Files: `apps/web/src/routes/LegalRoute.tsx` (section ids, line 10), `en.json` / `ua.json` / `ru.json`, `AboutRoute.tsx`.

- [x] (done 2026-11-13; controller shown as "carsua.app" + Contact page, no personal name, decided by the user; tables rendered by `routes/legal/LegalTable.tsx`) New Privacy sections: controller (**user decides what identity to show**), registry / scraped data (sources, legal basis, objection
      via `/contact`), device storage + cookie table, account data per provider, retention table, processors and transfers
      (Contabo DE, Cloudflare, Resend, PostHog EU, Sentry, Google, Telegram, Disqus), rights (portability "on request" since export is not built;
      authority: Ukrainian Ombudsman or the EU DPA)
- [x] Processors list must include Google Maps (nearby services, live background) and YouTube (streams), and say embeds load only on a click
      (or as decided in Step 2b)
- [x] (table written with all known cookies, incl. Google and Telegram; **google.com check done 2026-11-13:** the earlier `www.google.com` entry came from a private window that had already visited google.com. In a clean incognito window, straight to carsua.app, nothing clicked, the cookie tree holds only `cf_clearance` on carsua.app and no google.com entry. The Google cookies (`NID`, `__Secure-STRP`, `SEARCH_SAMESITE`, `g_state`) and `stel_ssid` appear only after the sign-in popup opens. Table text was already correct, nothing to gate) Cookie table: also list what a DevTools check on carsua.app showed (2026-11-13): `cf_clearance` (Cloudflare challenge, security), `g_state` (Google sign-in), and third-party cookies from Google (`NID`, `__Secure-STRP`, `SEARCH_SAMESITE`) and Telegram (`stel_ssid` on oauth.telegram.org / t.me). **Checked 2026-11-13** in a fresh private window: signed out, carsua.app holds only `cf_clearance` and empty local storage (no `ph_*`, no Google / Telegram cookies); the Google and Telegram cookies appear only after the sign-in dialog is opened, which loads **both** widgets (so list both even if the visitor uses one). **Still to check:** a `https://www.google.com` entry already shows in the signed-out cookie tree; open it and see which cookies it holds, and find what loads it on a plain page load (nothing in `apps/web/src` does so by default; if it is an embed, gate it)
- [x] Fix `about.p2` ("and their owners") and `privacy.device.p`; update the `account.delete.*` dialog and `legal.updated`
- [ ] Follow `docs/checklists.md` ("Docs after a feature", "App version")

### Step 4b. Follow-ups from the Step 4 review (added 2026-11-13)

- [x] Privacy controller section mentions custom site / web-app work (turnkey, via Contact); table of contents on /privacy and /terms (`LegalRoute.tsx`)
- [x] (done 2026-11-13: new "Data and privacy" section on /install in ua/ru/en, link to /privacy was already in the footer; also fixed `install.cache.1` "not synced anywhere", wrong for signed-in users) `/install` (`routes/install/InstallRoute.tsx`): read what it claims; add a short paragraph that the installed app uses the same browser storage
      (local storage, IndexedDB, offline cache), uninstall / clearing site data removes it, account sync and deletion as on Privacy, link to /privacy
- [x] (done 2026-11-13: `about.custom` paragraph + /contact link in `AboutRoute.tsx`; PostHog "EU cloud, cookieless, nothing stored on your device", Sentry "query strings removed", OpenStreetMap / Google Maps "load only after a click"; `about.p2` already fixed in Step 4) `/about`: short mention of the custom-app service (ua/ru/en); check PostHog / data-source wording against the new facts
- [x] (done 2026-11-13: "data" needed no change; "sharedPhotos" now says the photo is deleted after 7 days and can be deleted earlier in the profile) `/terms`: check "data" and "sharedPhotos" against the retention table (shares 7 days, 14-day grace); do not duplicate cookies / processors
- [x] (done 2026-11-13: `components/ThirdPartyNote.tsx` (amber warning chip with ⚠️), old `map.consent` / `nearby.loadMapConsent` / `discuss.consent` keys replaced by `thirdParty.*`; YouTube player modals were added later the same day: `YouTubeModal` shows the note, which covers `VideoStrip`, `EuroNcapRatings` and `JncapRatings`; `YouTubeModal.test.tsx`) Third-party note at the click: one shared `ThirdPartyNote` component (provider name, "loading sends your IP to X", link to
      `/privacy#privacy-thirdParty`; Disqus also says it sets cookies) on every gate placeholder / modal: `RegionMap` (OpenStreetMap), `DiscussRoute`
      (Disqus), `NearbyServices` + `LiveBackground` + `SharedLayoutPrompt` (Google Maps / YouTube), Sketchfab and carshow360 modals;
      ua/ru/en, no em dash; tests: note shown before the click
- [x] (done 2026-11-13, see Step 4: clean-window check, no google.com cookies on a plain page load, no change needed) The `google.com` cookie-tree check
- [ ] Docs after a feature (`docs/checklists.md`): plan-done, PLAN, features-reference, About; version in `releases.ts` (currently v2.1215 for the uncommitted YouTube note change; a new uncommitted change uses `git rev-list --count stage` + 1)

### Step 5. Account-deletion test (needs the user: throwaway account + VPS DB access)

- [x] Sign in with a throwaway email account; add a favorite, a setting, a shared photo; note `users.id`
- [x] Delete at `/profile`: cookie cleared, `app.sessions` empty, shared photo row + R2 object gone, email received
- [x] Sign in again: `deletion_scheduled_at` cleared (restored)
- [x] Delete again, set `deletion_scheduled_at = now() - interval '15 days'` for that id only, restart the API or wait 6 h: counts across every
      `app.*` table are 0 and the ledger object exists
- [x] Record results here; close the gate in `docs/security-checklist.md:158` and the open item at `docs/deploy.md:322`

#### Step 5 runbook (prepared 2026-11-13; the user runs it on the VPS, nothing here was executed by the agent)

Status 2026-11-13: **done, all checks passed** (results below). `stage` was merged to `main` and `deploy-api` / `deploy-web` were green, so the VPS ran the
Step 1-4 code and the `restore-replay-deletions.sh` overrides. Gate closed in `docs/security-checklist.md`, open item closed in `docs/deploy.md` (with the
`ENV_FILE` / `PG_CMD` note under "Deletion replay").

**Results (throwaway `rukrak86+deltest@gmail.com`, user `a1238920-0ebc-49d4-9cae-cca7d1badf9c`, run 2026-11-13 on the VPS):**

| Count (`app.*` by user) | 1 before delete | 2 after delete (grace)          | 4 after purge |
| ----------------------- | --------------- | ------------------------------- | ------------- |
| users                   | 1               | 1 (`deletion_scheduled_at` set) | 0             |
| auth_identities         | 1               | 1                               | 0             |
| sessions                | 1               | **0**                           | 0             |
| user_features           | 0               | 0                               | 0             |
| user_saved_entries      | 492             | 492                             | 0             |
| user_settings           | 1               | 1                               | 0             |
| known_devices           | 2               | 2                               | 0             |
| digest_sends            | 0               | 0                               | 0             |
| shared_photos           | 1               | **0**                           | 0             |
| email_challenges        | 3               | 3                               | 4 (see below) |

- Share photo: `shares/4df17470-0111-4cc6-ad7a-163dcc8362b5.jpg` listed by `rclone lsf` before, **gone right after the delete** (grace period, not at purge).
  The old share link then shows "link expired / photo deleted" (**HTTP 410**, not 404 as the runbook guessed). `carsua_sid` was gone in DevTools;
  `carsua_did` (device cookie, documented) stays by design. "Account scheduled for deletion" email received, both times.
- Restore: signing in again gave the same `users.id` with `deletion_scheduled_at` NULL.
- Purge: after the back-dated `UPDATE` (1 row) and `docker compose restart api-green`: `[AccountPurgeService] Purged 1 account(s) past the deletion grace period`;
  every count above is 0 except `email_challenges`; `rclone lsf LEDGER:carsua-shares/deleted/` lists `a1238920-0ebc-49d4-9cae-cca7d1badf9c`.
- `email_challenges` was **still 4 on day 0** (3 before + the restore sign-in and second delete): rows keyed on the address are removed by the API a day after
  they expire, not by the purge. **Day-1 recheck pending** (user): expected 0; add the value here when known.
- Scratch replay (`pgscratch` container, `PG_CMD="docker exec -i pgscratch"`): `DELETE 1`, `replayed 1 deletion(s)`, only the `...0001` control row left,
  `user_settings` count 1 (cascade). Production DB untouched.

Shell helper on the VPS (production DB: only `SELECT`, plus the one `UPDATE` on the throwaway id, never anything unscoped):

```bash
cd /opt/carsua/compose && export COMPOSE_FILE=docker-compose.prod.yml
pg() { docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'; }
pg <<'SQL'
SELECT id, email, deletion_scheduled_at FROM app.users WHERE email = 'THROWAWAY@example.com';
SQL
```

Count query (paste the id and email; every row is 0 after the final purge; `email_challenges` is by `user_id` OR the address):

```bash
pg <<'SQL'
\set uid 'PASTE-UUID'
\set mail 'THROWAWAY@example.com'
SELECT 'users' t, count(*) FROM app.users WHERE id = :'uid'
UNION ALL SELECT 'auth_identities', count(*) FROM app.auth_identities WHERE user_id = :'uid'
UNION ALL SELECT 'sessions', count(*) FROM app.sessions WHERE user_id = :'uid'
UNION ALL SELECT 'user_features', count(*) FROM app.user_features WHERE user_id = :'uid'
UNION ALL SELECT 'user_saved_entries', count(*) FROM app.user_saved_entries WHERE user_id = :'uid'
UNION ALL SELECT 'user_settings', count(*) FROM app.user_settings WHERE user_id = :'uid'
UNION ALL SELECT 'known_devices', count(*) FROM app.known_devices WHERE user_id = :'uid'
UNION ALL SELECT 'digest_sends', count(*) FROM app.digest_sends WHERE user_id = :'uid'
UNION ALL SELECT 'shared_photos', count(*) FROM app.shared_photos WHERE user_id = :'uid'
UNION ALL SELECT 'email_challenges', count(*) FROM app.email_challenges WHERE user_id = :'uid' OR email = :'mail';
SQL
```

1. **Prepare.** Private window, sign in at carsua.app with the throwaway address (email code). Save a favorite (plate page), change a setting
   (`/settings`), share a photo (Search by image, then the share link). Run the id query, then the count query: users 1, identities 1, sessions
   1+, saved entries 1+, settings 1, shared_photos 1 (note its `object_key`: `psql ... -c "SELECT object_key FROM app.shared_photos WHERE user_id = '<id>'"`).
   Photo object: `set -a; . /opt/carsua/env/backup.env; set +a; rclone lsf LEDGER:carsua-shares/shares/` shows `<id>.jpg` (and `.orig` within 1 h).
2. **Delete.** `/profile`, Delete account (asks for a fresh email code, sudo mode). Expect: signed out, `carsua_sid` gone in DevTools, email
   "deletion scheduled" received. Counts: users still 1 with `deletion_scheduled_at` set, sessions 0, shared_photos 0, and the `shares/<id>.jpg`
   object gone from the `rclone lsf` above. Opening the old share link shows "expired" (HTTP 410).
3. **Restore.** Sign in again with the same address: `deletion_scheduled_at` is NULL (re-run the id query). Note: this keeps the same `users.id`.
4. **Purge.** Delete again, then:
   `pg <<'SQL'` / `UPDATE app.users SET deletion_scheduled_at = now() - interval '15 days' WHERE id = 'PASTE-UUID';` / `SQL`, then restart the
   live api container (purge also runs 6-hourly, and once at boot). Check `docker compose logs <live api service> --since 5m | grep Purged`
   ("Purged 1 account(s)"), the count query (all 0), and the ledger: `rclone lsf LEDGER:carsua-shares/deleted/` lists `<id>`.
   (`email_challenges` rows keyed on the address are removed by the API a day after they expire, not by the purge: re-check the next day.)
5. **Replay on a scratch DB** (never production). `restore-replay-deletions.sh` now takes `ENV_FILE` and `PG_CMD` overrides (defaults unchanged); the
   VPS copy updates on the next `deploy-api` (or `scp` the file to `/tmp` and run it from there). On the VPS:

```bash
docker run -d --name pgscratch -e POSTGRES_USER=scratch -e POSTGRES_PASSWORD=x -e POSTGRES_DB=scratch postgres:18.6 && sleep 8
docker exec -i pgscratch psql -U scratch scratch <<'SQL'
CREATE SCHEMA app;
CREATE TABLE app.users (id uuid PRIMARY KEY);
CREATE TABLE app.user_settings (user_id uuid PRIMARY KEY REFERENCES app.users ON DELETE CASCADE);
INSERT INTO app.users VALUES ('PASTE-UUID'), ('00000000-0000-4000-8000-000000000001');
INSERT INTO app.user_settings SELECT id FROM app.users;
SQL
PG_CMD="docker exec -i pgscratch" bash /opt/carsua/compose/restore-replay-deletions.sh
docker exec -i pgscratch psql -U scratch scratch -c "SELECT id FROM app.users" -c "SELECT count(*) FROM app.user_settings"
docker rm -f pgscratch
```

Expect "replayed 1 deletion(s)" (more if other ledger entries exist), only the `...0001` control row left, `user_settings` count 1 (cascade).
The script's last line prunes real ledger entries older than 14 days: intended, and the new entry is younger. Optional, truer: `pg_restore`
the newest nightly into the scratch container first (docs/deploy.md "Restore from R2" A, with `-d scratch`), then run the script.

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
