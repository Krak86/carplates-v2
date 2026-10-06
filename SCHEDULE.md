# SCHEDULE.md

Plan for the recurring ingest/refresh jobs. **Do this after the VPS deploy (PLAN.md Phase 4).**
Nothing here is built yet — no scheduler exists in the repo. Drafted 2026-10-06.

## Principles

1. **Poll often, work rarely.** A cheap "did anything change?" check on a short cadence; heavy work only on change.
   `scripts/src/ingest.ts` already compares CKAN `last_modified` with `registry.ingested_resources`, so a daily
   trigger costs one API call on most days. This covers "monthly, but daily until the new month appears" with no special case.
2. **Scheduler lives outside the API process.** A separate `ingest-cron` container (or host cron / supercronic)
   running one-shot `pnpm …` commands. Not `@nestjs/schedule`: it double-fires with 2+ API instances and competes
   with request traffic for memory during a large ingest.
3. **Idempotent and non-overlapping.** `pg_try_advisory_lock(<job id>)` at start, exit 0 if held; hard timeout per job;
   keep the PLAN.md safety guard (abort if row count < ~80% of previous run).
4. **Run log + dead-man's-switch.** `registry.job_runs` (job, started, finished, status, rows, error). Ping
   healthchecks.io (or similar) on success so a dead scheduler alerts, not just a failed job.
5. **UTC or Europe/Kyiv, with jitter.** Don't start two jobs at the same second. Keep 1 req/s and robots.txt rules;
   use conditional GET (ETag / If-Modified-Since) where the source supports it.
6. **Chain derived data after the source.** Registry load -> backfill -> `db:refresh-stats` -> `db:refresh-fuel-stats`.
   Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` so reads never block.
7. **CSV seeds stay human-reviewed.** Scrapers write to the DB; `export:*:csv` + commit is a manual/PR step so a bad
   scrape doesn't silently become the seed.

## Schedule

| Task                             | Command                                              | Cadence                                                 | Notes                                                                                                                          |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| RSS news                         | `pnpm ingest:news`                                   | Daily (PLAN.md suggests every ~6 h)                     | Idempotent; shorter interval is nearly free.                                                                                   |
| Brand YouTube channels           | `pnpm ingest:social`                                 | Daily (same slot as the news ingest)                    | 54 public RSS feeds (50 makes + 4 groups) at 1 req/s (~1 min). Idempotent; a dead feed is reported, never fails the run.       |
| Plates (data.gov.ua)             | `pnpm ingest:full` -> backfill -> stats              | **Daily**, ~03:00 Kyiv                                  | Real work ~monthly (new month published). Holds an exclusive lock on `registrations` for minutes — run at night.               |
| Wanted-cars list                 | not built (PLAN.md)                                  | Daily, or every 2-6 h                                   | Same `last_modified` pattern.                                                                                                  |
| Safety ratings                   | `ingest:euroncap`, `jncap`, `cncap`, `kncap`, `iihs` | Half-yearly                                             | Add a January run for IIHS awards. Quarterly is fine (cheap).                                                                  |
| Emissions / fuel                 | `ingest:fuel` -> `db:refresh-fuel-stats`             | Half-yearly                                             | EPA ~2x/year, EEA 1x/year.                                                                                                     |
| Reviews                          | `ingest:topgear`, `ingest:infocar`, `ingest:press`   | Half-yearly                                             | infocar ~25 min, topgear ~20 min; HTML cached, only changed pages refetched.                                                   |
| Videos (infocar)                 | `ingest:infocar:videos`                              | Half-yearly                                             | Takes hours — long timeout.                                                                                                    |
| Videos (YouTube)                 | `ingest:youtube-videos`                              | **Daily until the gap list is empty**, then half-yearly | Quota-bound (9,000 of 10,000 units/day), resumable. First partial CSV seed committed 2026-10-06 (≥5,000 tier, 16 models left). |
| Wiki images                      | `ingest:wiki-images` (no `--refresh`)                | Half-yearly                                             | Adds new models only. Run `--retry-failed` a day later.                                                                        |
| Sketchfab / carshow360 / e-drive | `ingest:sketchfab`, `carshow360`, `edrive`           | Half-yearly or yearly                                   | Not in the original list — decide whether to include.                                                                          |

## Open decisions

- Plate check stays daily forever (recommended): ~29 no-op runs a month, also catches mid-month corrections.
- Slow half-yearly jobs: one sequential "refresh" job, or staggered across the month (recommended: stagger, one heavy job at a time).

## Build steps (when picked up)

1. Migration: `registry.job_runs` table.
2. A small wrapper (`scripts/src/run-job.ts`): advisory lock, timeout, run-log row, exit code, health ping.
3. `ingest-cron` service in the prod `docker-compose` with a crontab file listing the schedule above.
4. Dry-run each job once on the VPS by hand before enabling its cron entry.
5. Alerting: healthchecks.io check per job (period + grace matching its cadence).
6. After first month: confirm the daily plate check no-ops correctly and the monthly load chains through to stats.
7. ~~Link this file from PLAN.md Phase 4 and CLAUDE.md's intro.~~ Done 2026-10-06.
