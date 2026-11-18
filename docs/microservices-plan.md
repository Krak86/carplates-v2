# Microservices + RabbitMQ + Kafka playground

Status: **idea / plan, 2026-11-18. Nothing built.** Implementation is for a later session. Purpose: learn microservices, RabbitMQ and Kafka on the real project; every piece is optional and must not break the site when a broker is off.

## Context

The owner wants hands-on practice with microservices, RabbitMQ and Kafka on the real project. Nothing in the app needs them today
(one VPS, one API, ~12 GB RAM, Postgres is the hot path), so every piece must be **optional and safe to break**: if a broker is
down or off, the site works exactly as now. Goal: features where each tool fits what it is actually built for, not fake demos.

### Kafka vs RabbitMQ: what each one is

Neither is a "microservice". A **microservice** is an independently deployable process that owns its data and talks to others over
the network. **RabbitMQ and Kafka are the brokers between them**, and they solve different problems:

|               | RabbitMQ (message queue)                                                                                 | Kafka (event log)                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Model         | Smart broker: exchanges route messages into queues; a message is **deleted once acked**                  | Append-only log per topic, kept for days; consumers track their own offset               |
| Good for      | **Commands / tasks**: "send this email", "recognize this photo"; one worker does it                      | **Events / facts**: "alarm started in Kyiv", "plate looked up"; many independent readers |
| Strong points | Per-message ack, retry with delay, dead-letter queues, priority, RPC (reply-to), prefetch = backpressure | Replay from any point, many consumer groups on one stream, ordering per key, high volume |
| Weak points   | No replay; a new consumer only sees new messages                                                         | No per-message retry/DLQ built in, heavier (JVM), overkill for a few msgs/min            |

Rule of thumb used below: **"do this" → RabbitMQ, "this happened" → Kafka.** Using both is legitimate: a Kafka event can lead a
consumer to publish a RabbitMQ task.

## Candidates found in the codebase

Existing seams that already behave like separate services or background work:

- `services/alpr/` — already a microservice (Python, ONNX), called **synchronously** over HTTP from
  `apps/api/src/recognize/local-recognize.service.ts` (`fetch(ALPR_LOCAL_URL/recognize)`).
- In-API timers listed in PLAN.md "Twelve-Factor audit" as "move to a worker at 2+ replicas": alarm poller
  (`alarm/alarm.service.ts`), losses refresh, account purge, shares cleanup, server stats, digest, wiki, safety video.
- Mail: `mail/mail.service.ts`, used by `digest/`, `contact/contact-mail.ts`, `auth/email-challenge.service.ts`.
- `alarm/events.service.ts` records `alarm_events`; PLAN.md open items: "later: SSE, webhook" and "a job that folds finished days of
  `alarm_events` into `alarm_history_daily`".
- Favorites are already server-side (`apps/api/src/sync/`, `app.user_saved_entries`) and Telegram login exists → a natural watchlist.
- Ingest jobs (`scripts/src/jobs.ts`, cron via `run-ingest.sh`) produce new rows (CKAN registrations Tue/Fri, wanted, auctions daily).
- `usage/usage.interceptor.ts` sees every request → a source of lookup events.

## Ideas, ranked (fit × learning value)

### 1. RabbitMQ: `mail-service` (first microservice) — best start

Extract sending into its own Nest app `apps/mail-service`. API publishes `mail.send` (`{template, to, data, idempotencyKey}`) to a
direct exchange; the service renders (move `mail/render.tsx` + `templates.tsx`) and sends via SMTP.
Learn: durable queues, manual ack, **retry with delay** (TTL queue → back to main), **dead-letter queue** after N tries,
idempotency, publisher confirms. Fallback: if the publish fails, API sends inline as today.

Honest note: Resend already provides delivery, bounces and its own retries, so this service is mainly a **learning project** (queue,
ack, retry, DLQ, idempotency), not a production need. The production-minded alternative is a Postgres outbox table.
Transport stays pluggable (`MAIL_TRANSPORT=resend|smtp`, already in `mail/mail.service.ts`), so the worker can send via Resend or a
custom SMTP relay. Before using **custom SMTP** set up in advance:

- **Prefer an SMTP relay** (Brevo, Amazon SES, Postmark, Mailgun) over a self-hosted Postfix/Mailcow: same `SMTP_URL`, no reputation work.
- **Sending domain**: use a subdomain (`mail.carsua.app`), keep `MAIL_FROM` / `MAIL_FROM_NEWS` on it.
- **DNS** in Cloudflare (DNS-only, grey cloud): **SPF** (one TXT record, include the provider), **DKIM** (provider's selector CNAME/TXT),
  **DMARC** (`_dmarc` TXT, start `p=none` with `rua=`, tighten later), plus a custom **Return-Path** CNAME for bounces.
- **Self-hosted only**: outbound **port 25 open** on the VPS (many providers block it by default, ask first), a clean dedicated IP
  (check blocklists), **rDNS/PTR** matching the HELO hostname, a TLS certificate, IP warm-up, bounce/complaint (FBL) handling,
  and a monitored abuse mailbox. This is real ongoing ops work and the usual reason to stay on a provider.
- **App side**: credentials as a secret in `SMTP_URL` (`smtps://user:pass@host:465` or STARTTLS 587), TLS verification on, a send
  rate limit below the provider quota, `List-Unsubscribe` header on the digest, and a test with mail-tester.com / Gmail headers
  (SPF, DKIM, DMARC all `pass`).
- Resend stays the default; the digest sender must remain a verified Resend domain while `MAIL_TRANSPORT=resend`.

### 2. Kafka: `alarm.events` stream + live push — best Kafka fit

Extract the poller into `apps/alarm-service`: it publishes `alarm.started` / `alarm.ended` keyed by region id (ordering per region)
to topic `alarm.events` (retention 7 days). Independent consumer groups:

- `recorder` → writes `alarm_events` (today's logic in `events.service.ts`);
- `sse` → API pushes live changes to browsers (`/api/alarms/stream`, the "later: SSE" item) instead of polling;
- `history-fold` → folds finished days into `alarm_history_daily` (the open optional PLAN item);
- `notify` → see idea 3.
  Learn: topics, partitions, keys, consumer groups, offsets, **replay** (reset `history-fold` to rebuild a day).

### 3. Both: "Watch this plate / VIN / region" notifications — the showcase feature

New user feature for logged-in users: get a Telegram or email message when a favorite plate/VIN changes.

- Ingest jobs (registrations, `wanted`, `wanted-plates`, `auctions`, `prozorro`) publish compact facts to Kafka topic
  `registry.changes` (`{kind: 'registration'|'wanted'|'auction', plate, vin, at}`, key = plate or vin). Volume is real (CKAN = many k rows).
- New `apps/watch-service` consumes, matches against favorites (`app.user_saved_entries` + opt-in flag in `user_settings`), and
  publishes a RabbitMQ task `notify.telegram` / `mail.send`.
- Also subscribes to `alarm.events` for "alert in my region" (opt-in).
- `notify-telegram` consumer sends via Bot API (Telegram login already gives the chat id).
  This is the real end-to-end pattern: **event log → stateful consumer → task queue → worker**.

### 4. RabbitMQ: ALPR via queue (work queue / RPC)

`recognize` publishes to `alpr.recognize` with `reply_to` + `correlation_id`; `services/alpr` consumes with `prefetch=1`
(ONNX is CPU-bound, so the queue becomes the concurrency limiter instead of HTTP timeouts). Python side: `aio-pika`. Keep HTTP as
fallback behind a flag. Learn: RPC pattern, prefetch/backpressure, competing consumers (scale `alpr` to 2).
Alternative transport for the same seam: gRPC, see idea 7 (pick one per experiment, do not stack both).

### 5. Kafka: lookup stream → "Trending now"

`usage.interceptor` publishes `lookup.performed` (plate/VIN hashed or only make/model/region — **no raw plates**, privacy) to Kafka.
`apps/trending-service` keeps sliding-window counts (last 1 h / 24 h) and serves `GET /trending` → home block "Most looked-up models
now". Learn: windowed aggregation, compacted topic for state, rebuild by replay.

### 6. RabbitMQ: `worker` for in-API timers + admin "Run job now"

Move the timers from the API into `apps/worker`; `/data-status` admin gets a "Run now" button that publishes `job.run {name}`
consumed by a runner that calls the same `scripts/src/jobs.ts` commands. Closes the Twelve-Factor "timers run per replica" gap.

### 7. gRPC: typed sync calls to ALPR (optional experiment)

gRPC is for **synchronous** service-to-service calls (HTTP/2, binary, typed contract, streaming). Nothing async in this plan needs it;
the one real seam is `apps/api` (Node) → `services/alpr` (Python), today `fetch(ALPR_LOCAL_URL/recognize)`.

- Contract: `services/alpr/proto/alpr.proto` (`rpc Recognize(RecognizeRequest) returns (RecognizeReply)`; image as `bytes`), one file
  generating both sides: Node (`@grpc/grpc-js` + `@grpc/proto-loader`, or `@connectrpc/connect` + `buf`), Python (`grpcio`, `grpcio-tools`).
- Why it fits: two languages, so the `.proto` is the shared contract that Zod cannot be. Bonus: deadlines, cancellation, health
  check protocol (`grpc.health.v1`), later server-streaming for batch frames.
- Rules: internal network only (browsers cannot call gRPC; the SPA keeps `POST /api/recognize`); keep HTTP as the fallback behind a flag
  (`ALPR_TRANSPORT=http|grpc`); validate the reply with Zod in the API anyway (cross-boundary rule).
- Not for: lookup (`plate`, `vin`), mail, alarms, watch (they are async, brokers fit them).
- Learn: protobuf schemas and evolution (field numbers), codegen, deadlines, status codes, HTTP/2 through the Docker network.

### 8. npm package: generic Ukrainian plate normalizer (open-source spin-off)

`packages/shared` stays the single source of truth for this app (`workspace:*`, never published, no semver overhead). Separately, the
**generic, dependency-free part** can be a small public package, for example `ua-plate` (name to check on npm):

- Scope: `normalizePlate` (Latin/Cyrillic homoglyphs, spaces, case), format detection (old/new/diplomatic/military/temporary), and the
  plate → region lookup. **No** Zod, DB, app schemas, or registry data.
- Extract into `packages/ua-plate` (own `package.json`, `exports`, ESM + CJS via `tsdown`/`tsup`, types, README, MIT, tests). The app's
  `packages/shared` then **imports it** (`workspace:*` in dev), so there is still one implementation, never a copy.
- The 2026 plate removal and `regions.ts` ↔ `registry.plate_regions` mirror stay app-side; the package only carries the statute
  tables (`regions.statute.test.ts` moves with them).
- Release: npm account + 2FA, **provenance** via GitHub Actions trusted publishing, semver, `CHANGELOG`, `files` whitelist, pinned
  devDependencies. A scoped name (`@carsua/plate`) avoids squatting problems.
- Cost: issues, semver discipline, a release step. Do it only if the public value is wanted; it is a learning goal (packaging,
  provenance), not an app need.

### Skipped (and why)

- Debezium CDC from Postgres: Kafka Connect is another JVM (~1 GB), too heavy for this VPS; publish from ingest code instead.
- Moving lookup (`plate`, `vin`) to a service: it is the hot path, synchronous by nature; queues add latency, no benefit.
- Splitting the DB per service: keep one Postgres, but each new service gets its **own schema + role** (`mail`, `watch`), which
  is the honest microservice boundary on one box.

## Recommended path (implementation order)

0. **Redis first** (owner decision 2026-11-18): the self-hosted Redis from the throttler item (PLAN.md) lands before any broker. It then
   serves as cache/throttler store, and also gives a near-free messaging option (BullMQ job queue, Redis Streams) with no new
   infrastructure. Consequence: mail-service (idea 1) can first be built on **BullMQ** (retry, delay, failed set, dashboard) and the
   RabbitMQ/Kafka versions stay as the deliberate learning step after it, so the same contract (`mailSendSchema`) can be compared
   across three transports. Keep Redis internal-only, password set, `maxmemory` + `maxmemory-policy noeviction` for queue data
   (a cache needs `allkeys-lru`, so use a separate DB/instance if both are used), `appendonly yes` if jobs must survive restarts.
1. **Infra (both brokers, opt-in)** — compose profile `mq` in `infra/docker-compose.yml`: `rabbitmq:<4.x pinned>-management`
   (UI on 15672, dev only) and `apache/kafka:<4.x pinned>` single node **KRaft** (no ZooKeeper), heap capped (`KAFKA_HEAP_OPTS=-Xmx512m`),
   plus a Kafka UI (`provectuslabs/kafka-ui` or Redpanda Console) dev only. Add pins to PLAN.md "Version pins".
   Env in `apps/api/src/env.ts`: `RABBITMQ_URL`, `KAFKA_BROKERS`, flags `MQ_MAIL`, `MQ_ALARMS`… all default off.
2. **Shared contracts** — `packages/shared/src/events.ts`: Zod schemas for every message (`mailSendSchema`, `alarmEventSchema`,
   `registryChangeSchema`) + topic/queue names as `as const` lists. Consumers validate on receive (cross-boundary rule).
3. **Idea 1 mail-service** (RabbitMQ basics).
4. **Idea 2 alarm-service + SSE** (Kafka basics).
5. **Idea 3 watch notifications** (both together; the user-visible feature).
6. Optional later: ideas 4, 5, 6, 7 (gRPC) and 8 (npm package).

### Lightweight broker alternatives (decision)

Decision: **keep RabbitMQ + Kafka as the primary learning targets** (they are what jobs ask for); the cost is acceptable because
the `mq` profile is opt-in, off in production by default, and the VPS has ~12 GB. Do not replace them, add lighter options only
where they teach something new or the RAM budget forces it:

| If                                          | Use                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Kafka RAM is too high on the VPS            | **Redpanda** (Kafka API, single binary, no JVM): drop-in, same client code, ideas 2, 3, 5 unchanged          |
| Want a third, tiny messaging lesson         | **NATS JetStream** (one ~20 MB binary, queues + streams + request/reply); try it for idea 4 (ALPR RPC)       |
| Real production value, minimal infra wanted | **BullMQ** (needs Redis, planned for the throttler) or **pg-boss** (Postgres only) instead of the whole `mq` |

What "opt-in, off in production" means: services under compose `profiles: [mq]` start only with `docker compose --profile mq up -d`;
the app reads flags (`MQ_MAIL`, `MQ_ALARMS`, ...) that default to off, so with no flags the API sends mail inline and polls alarms as
today. Production deploys without the profile and flags, so a broker outage cannot break the site. It is a default, not a permanent
rule: enable per feature after it works locally and the RAM budget is checked.

BullMQ / pg-boss are alternatives only for the **task-queue** half (retry, delay, failed jobs), not for the Kafka **event-log**
half (replay, consumer groups, ordering; closest are Redis Streams and Redpanda). Fit for this app:

- Production value (one VPS, one team, moderate volume): BullMQ (Redis) or pg-boss (Postgres, can enqueue in the same transaction
  as the data write, which RabbitMQ cannot). No extra broker to run.
- Learning value: RabbitMQ/Kafka teach what those hide (exchanges and routing, partitions, offsets, replay). The plan's goal is
  learning, so the heavy brokers stay.
- Why teams choose RabbitMQ/Kafka anyway: scale (Kafka: millions of events/s over many nodes), many teams and languages on one neutral
  contract, richer features (routing, priorities, RPC, long retention, replay, exactly-once, connectors), a broker independent of the
  app database, and industry standard knowledge. None of these apply to this app yet.

Keep broker access behind a small interface in `packages/shared` (publish/subscribe + Zod contracts), so swapping a broker never
touches business code.

Libraries: `@nestjs/microservices` has both transports (`Transport.RMQ`, `Transport.KAFKA`) — idiomatic with the existing Nest
code and `@Inject` rule. Note its Kafka transport uses `kafkajs` (unmaintained since 2023); for direct use prefer
`@confluentinc/kafka-javascript` (KafkaJS-compatible API). RabbitMQ: `amqplib` + `amqp-connection-manager` (what Nest uses).
New apps follow the API conventions: ESM, `.js` imports, Zod env, explicit `@Inject`, colocated Vitest.

Production: only after it works locally. Memory budget on the 12 GB VPS ≈ RabbitMQ 200 MB + Kafka 700 MB + 3 small Node services
~100 MB each; add `mem_limit`s, internal network only (no published ports), and a "After deploy" checklist in PLAN.md.

## Critical files

- `infra/docker-compose.yml`, later `infra/docker-compose.prod.yml` — brokers under profile `mq`
- `apps/api/src/env.ts` — broker URLs + feature flags
- `packages/shared/src/events.ts` (new) — message contracts
- `apps/api/src/mail/mail.service.ts`, `digest/`, `contact/contact-mail.ts`, `auth/email-challenge.service.ts` — publish instead of send
- `apps/api/src/alarm/alarm.service.ts`, `events.service.ts` — poller extraction, SSE endpoint
- `scripts/src/ingest.ts`, `wanted.ts`, `auctions.ts`, `prozorro.ts` — publish `registry.changes`
- New: `apps/mail-service/`, `apps/alarm-service/`, `apps/watch-service/` (+ `pnpm-workspace.yaml`)
- Docs: `docs/features-reference.md` new section "Messaging (RabbitMQ / Kafka)", PLAN.md items, `releases.ts` when web changes

## Verification

- `docker compose --profile mq up -d`; RabbitMQ UI shows `mail.send`, `mail.send.retry`, `mail.send.dlq`; Kafka UI shows `alarm.events`.
- Mail: send a contact form → message in Mailpit; stop SMTP → message moves retry → DLQ after N; restart → no duplicates.
- Broker off (`docker stop rabbitmq`) → contact form still sends inline (fallback works).
- Alarms: mock source (`alarm/mock.source.ts`) emits a start → browser SSE updates without reload; reset the `history-fold`
  group offset to earliest → day rebuilt with identical numbers.
- Watch: favorite a plate, publish a fake `registry.changes` row → Telegram/Mailpit message once.
- Unit tests for every Zod contract and consumer handler; `pnpm test`, `pnpm lint`, `pnpm format`.
