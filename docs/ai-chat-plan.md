# AI chat (RAG + pgvector + Gemini free tier, SSE)

Status: planned 2026-11-14, nothing built yet. Backlog boxes: `PLAN.md` "AI chat: RAG + pgvector + Gemini free tier, SSE".

## Context

Users should be able to ask questions in plain language, such as "what does the AA prefix mean?", "is this car's history OK?" or
"what do I need to re-register a car?", and get a streamed answer. Answers are grounded in:

1. **App help / FAQ**: user-facing texts, retrieved by vector search.
2. **Ukrainian traffic and registration law**: curated public-domain texts, retrieved by vector search.
3. **Current vehicle context**: when the chat is opened on a plate or VIN page, the server loads that vehicle itself.
4. **Registry data via tools**: Gemini function-calling into the existing `PlateService` and `VinService`.

Decisions already made:
- **Model provider:** Gemini free tier.
- **Access:** public, with a per-IP throttle and a global daily cap.
- **UI:** a floating button that opens a drawer, on every page.

**Conflict to resolve:** `docs/assistant-plan.md` ("Rule-based assistant, **no AI**") is still unapproved in `PLAN.md:1462`.
This plan replaces its in-app chat part. The embeddable iframe widget in that plan stays rule-based and separate. Edit that doc
to say so; its "Without AI? Yes" answer is superseded for the in-app chat.

Current state: there is no AI, embedding or SSE code anywhere. Postgres is `postgres:18.6`, which has no pgvector.

## 0. Save this plan in the repo (first step after approval)

- Create **`docs/ai-chat-plan.md`** containing this plan (sections 1-6 and Verification), in the same style as
  `docs/assistant-plan.md`: `# AI chat (RAG + pgvector + Gemini, SSE)`, then `## Context`, `## Architecture` and so on.
- In `PLAN.md`, next to the assistant-plan entry (~line 1462), add an open item:
  `- [ ] AI chat (RAG + pgvector + Gemini free tier, SSE) - see docs/ai-chat-plan.md`.
  Add one sub-box per phase: infra/DB, API, corpus + index, web, docs/release.
- At the top of `docs/assistant-plan.md`, add a note: "In-app chat: superseded by `docs/ai-chat-plan.md` (AI). The embed widget
  below stays rule-based."

## 1. Infra + DB

- **Postgres image:** in `infra/docker-compose.yml:7` and `infra/docker-compose.prod.yml:79`, change `postgres:18.6` to a pinned
  `pgvector/pgvector:0.8.x-pg18` tag. Verify the exact tag exists at implementation time. The image is built on the official
  pg18 image, so the data directory is compatible.
  - Add a `PLAN.md` "After deploy" box: swap the image on the VPS **before** the migration runs.
- **Migration** `packages/db/migrations/0105_ai_chat.sql` (new tables only, so it is safe for blue/green):
  - `CREATE EXTENSION IF NOT EXISTS vector;`
  - Table `app.ai_chunks`:
    - columns: `id bigserial PK`, `source text` (`'help'|'law'`), `doc_id text`, `lang text CHECK (ua|ru|en)`, `title text`,
      `url text NULL`, `content text`, `content_hash text UNIQUE`, `embedding vector(768) NOT NULL`, `updated_at timestamptz`;
    - HNSW index on `embedding vector_cosine_ops`;
    - index on `(source, doc_id)`.
  - Table `app.ai_usage`: `(day date PK, requests int, tokens int)` holds the global daily budget counter.
- **Drizzle:** in `packages/db/src/schema.ts`, under the `app` schema (~line 1669), add a `vector(768)` `customType` (same pattern as
  `bytea` at line 580) and both tables, with `$inferSelect` row types.

## 2. Shared contracts: `packages/shared/src/chat.ts` (own file, so saved offline data isn't discarded)

- `CHAT_ROLES = ['user','model'] as const` and the type derived from it.
- `chatRequestSchema`:
  - `messages`: up to 12 items, each `{ role, text }`, with `text` up to 2000 characters;
  - `lang`;
  - `context?`: `{ kind: 'plate'|'vin', value }`.
- `CHAT_EVENT_TYPES = ['token','tool','sources','done','error'] as const`, plus a Zod schema for each event payload. For example,
  `sources` is `[{ title, url, source }]` and `error` is `{ code: 'rate'|'budget'|'unavailable'|'disabled' }`.
- Export from the package index, then run `pnpm --filter @carplates/shared build`.

## 3. API: `apps/api/src/chat/`

- **`env.ts`:**
  - variables: `GEMINI_API_KEY` (optional secret), `GEMINI_CHAT_MODEL` (default `gemini-2.5-flash`), `GEMINI_EMBED_MODEL`
    (default `gemini-embedding-001`), `AI_DAILY_BUDGET` (default 200);
  - gate: `aiChatEnabled = (env) => Boolean(env.GEMINI_API_KEY)`, next to `marketEnabled` (~line 172);
  - list the new variables in `deploy-api.yml` and `docs/deploy.md`.
- **`gemini.provider.ts`:**
  - a thin wrapper over `@google/genai` (new dependency, pinned version);
  - `embed(texts, taskType)` requests 768 dimensions (`outputDimensionality`);
  - `streamChat({ system, contents, tools, signal })`;
  - maps 429 / 5xx to a typed `ChatUpstreamError('rate'|'unavailable')`, following the pattern in
    `market/carapis.provider.ts:50-76`.
- **`retrieval.service.ts`:**
  - embeds the question (`RETRIEVAL_QUERY`);
  - runs `ORDER BY embedding <=> $1 LIMIT 6` with a filter on `lang` (falling back to `ua`) and a distance cutoff;
  - returns chunks plus source links.
- **`chat-tools.ts`:**
  - Gemini function declarations: `lookup_plate(plate)`, `plate_history(plate)`, `decode_vin(vin)`;
  - they call `PlateService.lookup/history` (`plate/plate.service.ts:29,102`) and `VinService.decode` (`vin/vin.service.ts:30`);
  - inputs are normalized with `normalizePlate` from shared (plate logic is never re-implemented);
  - output is compacted to the fields the model needs, to keep the prompt small.
- **`chat.service.ts`:**
  - Returns `async function* stream(req, signal)` that yields typed events.
  - Steps:
    1. Check the budget (`ai_usage` upsert; same idea as `market/market.service.ts:46-95` and
       `recognize/cloud-recognize.service.ts`).
    2. Retrieval for the last user message.
    3. If `context` is set, load the vehicle server-side. Client data is never trusted.
    4. Build the system prompt: answer in `lang`; use only the context, retrieved chunks and tool results; say "I don't know"
       otherwise; never invent registry facts; cite sources.
    5. Stream tokens.
    6. Function-call loop, at most 3 tool rounds, emitting a `tool` event for each call.
    7. Emit `sources` and `done`.
  - Messages are **not stored**: the service is stateless and the history comes from the client.
- **`chat.controller.ts`:**
  - `GET /api/chat/status` returns `{ enabled }` (short edge cache).
  - `POST /api/chat`:
    - validated with `zodParam(chatRequestSchema)` (`common/zod-param.pipe.ts`);
    - throttled with `@Throttle(CHAT_THROTTLE)` (10 per 10 min per IP, in `common/throttle.ts`);
    - `Cache-Control: no-store`, `X-Accel-Buffering: no`;
    - returns `new StreamableFile(Readable.from(sseEncode(service.stream(...))), { type: 'text/event-stream' })`. This is the
      same `StreamableFile` pattern as `wiki/wiki-recolor.controller.ts:55`, so no `@Res()` is needed.
    - When the client disconnects (request `close`), abort the Gemini call.
- **`chat.module.ts`:** import the plate and VIN modules; every constructor uses an explicit `@Inject(...)`. Register the module in
  `app.module.ts`.
- **Edge:** `/api/chat` is never cached; add it to `PUBLIC_API_PATH_PREFIXES` per the checklist. Check that Caddy and Cloudflare
  don't buffer `text/event-stream` (Caddy flushes SSE automatically; check `infra/Caddyfile:55-65` and add `flush_interval -1`
  if needed).

## 4. Corpus + indexing job

- **Sources:**
  - `scripts/seed-data/ai-corpus/help/{ua,ru,en}/*.md`: user-facing FAQ written from the About page and i18n texts, plate format
    and regions (generated from `regions.ts`), and data sources and freshness.
  - `scripts/seed-data/ai-corpus/law/ua/*.md`: curated excerpts from zakon.rada.gov.ua (official texts are public domain under
    Art. 10 of the Ukrainian copyright law):
    - the Law "Про дорожній рух";
    - КМУ Resolution №1388 (vehicle registration procedure);
    - the relevant sections of ПДР.
  - Each file has front-matter with `title` and `url`.
- **`scripts/src/ai-index.ts`** (`pnpm ai:index`):
  - splits each file on headings or articles (~800 tokens, with overlap);
  - hashes each chunk and **embeds only new or changed hashes**, which saves free-tier quota;
  - batch-upserts the rows and deletes chunks whose hash has disappeared.
  - It changes only `app.ai_chunks`, never `registry.*`.
  - The pure chunker goes in `scripts/src/ai-chunk.ts` with tests.
- Add the job to `scripts/src/jobs.ts` and the root `package.json`. It does not run on cron; it runs after the corpus changes and
  as a deploy step.

## 5. Web: `apps/web/src/components/chat/`

- **`ChatLauncher.tsx`:**
  - a fixed bottom-right button;
  - placed so it doesn't collide with `ScrollButtons` or `PwaUpdatePrompt`;
  - rendered only when `chatStatusQuery` says the chat is enabled;
  - lazy-loads the drawer.
  - It is mounted lazily in `components/Layout.tsx`, like `ScrollButtons` (line 35).
- **`ChatDrawer.tsx`:**
  - a hand-rolled dialog in the same style as `TranslateDialog`;
  - contains the message list, input, stop button, suggested-question chips, tool status lines ("Checking AA1234BB…") and
    source links;
  - shows a privacy note: "answers by Google Gemini; don't enter personal data; may be inaccurate".
- **`ChatMessage.tsx`:** plain text with `whitespace-pre-wrap` and no markdown library.
- **`use-chat-actions.ts`:**
  - `useState` for the message list;
  - streams with `fetch` POST, an `AbortController` and the `ReadableStream` reader;
  - auto-attaches context by running `classifyQuery` (shared) on the `/:query` route param;
  - maps 429 / `error` events to i18n messages.
  - It does not use `useQuery`, so nothing is persisted offline.
- **`helpers.ts`:** a pure SSE frame parser that validates each event with the shared Zod schemas; it has tests.
  **`types.ts`.**
- **Other web changes:**
  - `lib/api.ts`: add `chatUrl` and `getChatStatus`.
  - `lib/queries.ts`: add `chatStatusQuery`.
  - `vite.config.ts` `globIgnores`: add the chat chunks (online-only).
  - i18n: add `chat.*` keys to `ua.json`, `ru.json` and `en.json`.
  - CSP: no change, because `'self'` covers the endpoint.

## 6. Docs / release (per `docs/checklists.md`)

- `docs/features-reference.md`: new section "AI chat (RAG)".
- `docs/assistant-plan.md`: note that it is superseded for the in-app chat.
- `PLAN.md`:
  - a done entry;
  - "After deploy" boxes: swap the pgvector image, set `GEMINI_API_KEY`, run `pnpm ai:index` on the VPS, and test streaming
    through Cloudflare;
  - a version-pin row only if `@google/genai` is held back.
- About / privacy: describe the Gemini free tier (Google may use prompts to improve its models; chats aren't stored by carsua).
- `releases.ts`: bump the day's version and add a `new` item in ua, ru and en.
- Suggest a commit message (no attribution line).

## Verification

1. `pnpm db:up` (pgvector image), then `pnpm db:migrate`, then check `SELECT extname FROM pg_extension` includes `vector`.
2. With `GEMINI_API_KEY` set, run `pnpm ai:index`; the rows appear. A second run embeds 0 chunks.
3. Unit tests (Vitest):
   - chunker;
   - SSE parser;
   - `chat.service` with a mocked provider: tool loop capped at 3, budget exhaustion gives `error: budget`, context is loaded
     server-side;
   - controller throttle;
   - `ChatDrawer` render (`await i18nReady`).
4. `curl -N -X POST localhost:3000/api/chat -H 'content-type: application/json' -d '{"messages":[{"role":"user","text":"що означає AA?"}],"lang":"ua"}'`
   should show tokens arriving incrementally, then `sources` and `done`.
5. Use the run skill or chrome-devtools: open a plate page and ask "чи є проблеми з цим авто?". The answer should show a tool call
   and real registry data. Stop mid-stream: the request should abort. 11 quick messages should give a 429 message.
6. Without `GEMINI_API_KEY`, the launcher is hidden and `/api/chat` returns `disabled`.
7. Run `pnpm format`, lint, typecheck and tests.
