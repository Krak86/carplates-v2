# Admin "Logs" tab: redacted VPS container logs (Vector + Loki + Backblaze B2 archive)

Status: planned 2026-11-26, steps 1 (shared redaction + RedactingLogger) and 2 (infra files) built 2026-11-26, step 3 (api) 2026-11-27, steps 4-5 not yet. Backlog boxes: `PLAN.md` "Admin logs (Vector + Loki + B2 archive)".

## Context

All VPS backend logs live only in Docker `json-file` logs (`infra/docker-compose.prod.yml` `x-logging`, 10m × 5 per container), readable only over SSH, and they contain raw plates / VINs / emails / IPs. Goal: search, filter and tail them from the carsua admin page, with personal data masked, kept for 14 days searchable + 90 days archived off-box. Sentry stays as it is (errors + traces, alerting); this is the raw, complete stream next to it.

Decisions made: UI = new tab in `/admin` only (no Grafana; a separate Vue/Angular admin app may come later and can reuse the same JSON endpoint). Storage = self-hosted Loki on the internal network + daily archive to a **separate Backblaze B2 bucket** (not R2). Redaction = partial mask. **No Prometheus**: Loki needs none, and host metrics already come from the admin Server tab (`apps/api/src/usage/server-stats.service.ts`).

Why B2, not R2: the R2 free tier is 10 GB-month per account, and it already holds the 14 nightly dumps, the 2 newest full dumps, the data.gov.ua ZIPs and up to ~8 GB of shared photos (`SHARE_STORAGE_CAP_BYTES`); `docs/deploy.md` already warns that ZIPs + a full dump may go over. B2 gives its own 10 GB free, uses the S3 API and works with rclone. A bucket-scoped key with only `writeFiles` + `listBuckets` means a compromised VPS can't read or delete the archive, and a B2 lifecycle rule removes files after 90 days.

Size estimate (check after a week on prod): about 20-100 MB/day of raw log text → 2-10 MB/day gzipped → **0.2-1 GB for 90 days**. Loki on the VPS disk: about 1-3 GB for 14 days.

## Architecture

```
containers ──json-file (tag = container name)──▶ /var/lib/docker/containers (ro mount)
   └▶ vector (file source, parse, VRL redaction) ─┬▶ loki:3100 (internal only, 14d retention)
                                                   └▶ /opt/carsua/logs/YYYY-MM-DD.ndjson.gz ──rclone (backup.sh logs)──▶ B2 carsua-logs (90d lifecycle)
browser /admin?tab=logs ──▶ api GET /api/admin/logs (AdminGuard, Zod) ──LogQL built server-side──▶ loki
```

How Vector reads: Docker already writes each container's stdout/stderr to `/var/lib/docker/containers/<id>/<id>-json.log` (one JSON line: `log`, `stream`, `time`, `attrs.tag`). Vector mounts that folder read-only, follows the files like `tail -F` (checkpoints in its own volume, so no duplicates on restart; handles the 10m × 5 rotation), parses and masks each line, then pushes to Loki and appends to the daily gz file. It runs as uid 0 only to read Docker's root-owned files, with every capability dropped, a read-only root filesystem and `no-new-privileges`.

B2 confirmed over Oracle/GCS/AWS/Azure (permanent 10 GB, EU region, write-only scoped key, lifecycle rules).

## Security model

- **No Docker socket anywhere.** Vector reads the log files through a read-only bind mount; container names come from the json-file `tag` option (`options: { tag: '{{.Name}}' }` writes `attrs.tag` into each line).
- **Redaction twice:** at the source in the API logger (so raw files on disk are clean too) and in Vector VRL for every container (postgres `DETAIL: Key (plate)=(…)`, caddy, alpr, ingest). Loki and B2 only ever see masked text.
- Loki: no `ports`, internal network only, `auth_enabled: false` is fine since only the api can reach it; `read_only`, `cap_drop: [ALL]`, `no-new-privileges`, non-root user, `mem_limit`. Same for Vector.
- API endpoint: `AdminGuard` (existing, `apps/api/src/auth/session.guard.ts`), `Cache-Control: no-store`, throttled, Zod-validated params. **The client never sends LogQL.** The api builds it from enums plus an escaped substring filter, and caps the time window (≤ 24 h per query, ≤ 500 lines).
- Each query is itself logged (admin user id + params, redacted) as an audit trail.
- B2: its own private bucket `carsua-logs`, its own key (write-only, scoped to that bucket) in `/opt/carsua/env/logs-archive.env` (`RCLONE_CONFIG_B2_*`, `LOGS_BUCKET`), never in `backup.env`; SSE-B2 encryption on; 90-day lifecycle rule set on the bucket, not by the VPS.

## Redaction (partial mask)

New `packages/shared/src/log-redact.ts` (single source of truth for TS; VRL mirrors it):

- Plate (Latin + Cyrillic, current and old UA formats, after the same normalization as `normalizePlate`): `AA1234BB → AA****BB`.
- VIN (17 chars, no I/O/Q): keep the WMI (3) + last 4 → `WVW**********1234`.
- Email → `r***@g***.com`; IPv4 → last octet `0`; IPv6 → keep the /48.
- Share tokens, `Authorization`, `Cookie`, `Set-Cookie`, `token=`/`code=` query params → `[redacted]`.
- URL paths keep their shape with the plate / VIN segment masked (`/api/plate/AA****BB`), which keeps the log useful. Sentry keeps its own stricter `scrubApiUrl` template rewrite (`apps/api/src/sentry-scrub.ts`) unchanged.
- Tests: `log-redact.test.ts` with a fixture file `packages/shared/src/__fixtures__/log-lines.txt` (raw → expected). The same fixture drives Vector's built-in `tests:` block (`vector test`) so TS and VRL can't drift; run it in CI.

## Changes

### Infra

- `infra/docker-compose.prod.yml`
  - `x-logging`: add `tag: '{{.Name}}'`.
  - New `vector` service: pinned `timberio/vector:<exact>-alpine`, mounts `/var/lib/docker/containers:/var/lib/docker/containers:ro`, `./vector.yaml:/etc/vector/vector.yaml:ro`, `../logs:/logs` (archive out), a data volume for checkpoints; `mem_limit: 256m`.
  - New `loki` service: pinned `grafana/loki:<exact>`, single-binary, filesystem storage in `../lokidata`, `./loki.yaml` ro; `mem_limit: 512m`; healthcheck `/ready`.
  - API env: `LOKI_URL: http://loki:3100` (api does not `depends_on` it; Loki down = the tab shows "logs unavailable").
- Built (step 2) with these differences: no Loki healthcheck (distroless image, no shell or wget; Vector has one); `LOKI_UID`, `../lokidata` and `../logs` seeded in `lib.sh` already; the `tests:` block is generated by `infra/gen-vector-tests.mjs` (`--check` + `vector test` run in `ci.yml`) and `vector.yaml` is in `.prettierignore`; VRL emulates JS lookarounds with lead / trail captures (an e-mail or IPv6 followed by a word char stays whole).
- New `infra/vector.yaml`: `file` source → `remap` (parse json-file envelope, take `attrs.tag` as `container`, parse inner JSON of Nest/pino lines, normalize `level`, run redaction VRL) → `loki` sink (labels: `container`, `level` only — low cardinality) and `file` sink (`/logs/%Y-%m-%d.ndjson.gz`, gzip). Plus `tests:` from the shared fixture.
- New `infra/loki.yaml`: filesystem TSDB, `retention_period: 336h`, compactor with retention on, ingestion limits sized small.
- `infra/vps/backup.sh`: new `logs` mode. It sources `logs-archive.env` instead of `backup.env`, runs `rclone copy /opt/carsua/logs B2:$LOGS_BUCKET --immutable` on yesterday's and older files (write-only, never deletes remotely), then deletes local files older than 3 days. Nightly cron after `nightly` in `bootstrap.sh`, with its own healthchecks ping. Mode `logs` is skipped with a warning if the env file is missing, so deploys work before B2 is set up.
- `infra/vps/bootstrap.sh` / `lib.sh`: create `/opt/carsua/logs` and `/opt/carsua/lokidata` with the right owners; `deploy-api.sh` copies `vector.yaml` / `loki.yaml` next to the compose file (as it does the Caddyfile) and `up -d vector loki`.
- PLAN.md "Version pins": add Loki and Vector exact versions.

### API

- `apps/api/src/env.ts`: `LOKI_URL: z.string().url().optional()` + `lokiEnabled(env)`.
- Source-side redaction: a `RedactingLogger extends ConsoleLogger` in `apps/api/src/common/redacting-logger.ts` that runs `redactLogText` on messages/context/stack before printing; used in `main.ts` instead of the bare `ConsoleLogger`.
- New feature `apps/api/src/logs/`: `logs.module.ts`, `logs-admin.controller.ts` (`@Controller('api/admin/logs')`, `@UseGuards(AdminGuard)`, explicit `@Inject`), `logs.service.ts` (builds LogQL, calls Loki `query_range` with timeout, maps + re-redacts defensively, Zod-parses Loki's response), `helpers.ts` (LogQL builder + string escaping), `types.ts`, tests for the builder (injection attempts: quotes, backticks, `|`, `}`) and the controller (non-admin → 403).
- `GET /api/admin/logs?container=&level=&q=&from=&to=&limit=&direction=` → `{ lines: [{ ts, container, level, message }], truncated }`. `GET /api/admin/logs/containers` → known container names (Loki label values) for the filter.
- Follow `docs/checklists.md` "new /api/* endpoint".

### Shared

- `packages/shared/src/log-redact.ts` (+ export from `index.ts`), and `adminLogsQuerySchema` / `adminLogsResponseSchema` in `packages/shared/src/account.ts` next to `adminServerResponseSchema` (account contracts file, so no offline-cache wipe). Rebuild shared.

### Web

- `apps/web/src/routes/admin/AdminRoute.tsx`: add `'logs'` to `ADMIN_TABS`.
- New `AdminLogsTab.tsx` (+ `use-admin-logs-actions.ts` hook, `helpers.ts` for level colors / time-range presets):
  - Filters: container (select), level (multi), text search, range presets (15 m / 1 h / 6 h / 24 h / custom), newest-first.
  - "Live" toggle: `refetchInterval: 5000` polling with `from = last ts` (no websocket).
  - Monospace virtual-ish list (cap 500), level badge, click a line to expand the parsed JSON, copy button.
  - Filter state in URL search params (shareable between admins).
- `apps/web/src/lib/api.ts` + `lib/queries.ts`: `getAdminLogs`, `adminLogsQuery(params)` via `queryOptions` (not offline-cached).
- i18n: `admin.logs.*` keys in the admin pack (read "Language dictionaries" in `docs/features-reference.md` first). UI strings use "-" not em dash.
- Bump the day's version in `packages/shared/src/releases/2026-11.ts`.

### Docs

- `docs/features-reference.md` new section "Admin logs"; `docs/security-checklist.md` §4 Docker services (Vector/Loki hardening) and redaction note; PLAN.md "After deploy" boxes: create dirs, deploy, create the B2 bucket + scoped key + lifecycle rule, verify a known plate shows masked in Loki and in a B2 file, verify the key cannot delete or download, verify Loki unreachable from outside, verify non-admin gets 403.

## Verification

- `pnpm --filter @carplates/shared build && pnpm test` (redaction fixture, LogQL builder escaping, controller 403, tab render test like `AdminServerTab.test.tsx`).
- `docker run --rm -v ./infra:/etc/vector timberio/vector:<pin> test /etc/vector/vector.yaml` — VRL output matches the shared fixture.
- Local: `infra/docker-compose.yml` gets optional `loki` + `vector` services (profile `logs`); run, hit `/api/plate/AA1234BB`, open `/admin?tab=logs`, search "plate", see `AA****BB` only; check the raw json-file on disk is masked too for api lines.
- `pnpm format`, lint, typecheck.
