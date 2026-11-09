# Rule-based assistant + embeddable widget (no AI, no MCP)

## Context

Users (and partner sites: dealers, forums, insurance blogs) want a simple "ask about this car" helper. It should answer from our own
DB/API for a plate or VIN, explain what the app can do, and be installable on other sites. Decisions taken:

- **Embedding:** any site may embed it, through an **iframe only**. CORS stays closed.
- **Data on other sites:** open data plus a link-out to the full card.
- **In the app:** a floating launcher on all pages.

### Answers to the open questions

- **Without AI? Yes.** Every question the app can answer has the same shape: one plate or VIN plus a known topic. That is a
  finite intent catalog. The assistant uses three things:
  - chips/buttons to choose a topic
  - a small keyword matcher (ua/ru/en synonyms) for free text
  - `classifyQuery` to detect a plate or VIN in the text

  The result is deterministic, free to run, and works offline-ish. No LLM costs and no hallucinated car facts.

- **Single or multiple widgets? One** code base and one page, with **several views** chosen by a parameter:
  - `chat`: Q&A panel
  - `search`: a search box plus a summary card
  - `badge`: a compact one-line lookup

  There is one CSP rule and one bundle to keep fast.

- **Plain HTML components? Yes.** Vanilla TS custom element `<carsua-assistant>` with Shadow DOM and native `<form>`, `<input>`,
  `<button>`, `<details>`, `<output>`. No React, no i18next, no Zod.
  - Size budget: **≤ 15 KB gz JS + inline CSS**.
  - The loader is a **facade**: on the host page it draws only a button. The iframe is created on the first click, so the host site
    pays ~0 KB until someone uses the assistant.
  - **Zero-JS option:** a plain `<form action="https://carsua.app/" target="_blank">` snippet.
- **MCP? Not needed.** MCP and WebMCP serve AI agents, not human widgets. Exposing per-vehicle lookups to agents also goes against
  the current stance (`features-reference.md` "Agent discovery": no per-vehicle endpoints in `llms.txt` or the public OpenAPI).
  Possible later step: WebMCP tools for the public stats/catalog only. Not part of this plan.

## Architecture

```
host site ──<script src=carsua.app/embed.js data-view=…>──► launcher button (no iframe yet)
                                     click ─► <iframe src=carsua.app/embed/assistant?view=chat&lang=ua&q=…>
iframe (same origin as API) ──GET /api/plate|vin|wanted|nhtsa…──► existing endpoints + throttles + edge cache
iframe ──postMessage {type:'carsua:resize'|'carsua:close'}──► embed.js (validates event.origin)
carsua.app SPA ──lazy import()──► same <carsua-assistant> element (no iframe)
```

### Code layout (new: `apps/web/src/assistant/`, framework-free, no `react` / `@/i18n` imports)

- `intents.ts`: the catalog as a `const INTENTS = [...] as const` array, with
  `type IntentId = (typeof INTENTS)[number]['id']`. Each intent has `needs: 'plate'|'vin'|'any'|'none'`, a keyword list per
  language, its endpoint(s) and an answer builder.
  - Vehicle intents:
    - "what car is it" (make, model, year, colour, body, fuel, engine, power)
    - region of the plate
    - owners and history count
    - registration history (a list)
    - last operation and date
    - wanted check
    - VIN decode (NHTSA)
    - US recalls (NHTSA)
    - NL specs/recalls (RDW, CC0)
    - "open the full card / section X" (deep link `/<plate>?section=<id>` from `SHARE_SECTIONS`)
  - General intents:
    - "what can the app do" (feature list)
    - "how to check a VIN"
    - "what do the plate letters mean" / region by code
    - customs calculator, stats, compare, guides (link-outs)
    - contact
- `match.ts`: normalises the text (lowercase, ё/є/і folding, Latin↔Cyrillic look-alikes handled by `normalizePlate`) and extracts a
  plate/VIN with `classifyQuery`. It scores intents by keyword hits and returns the best intent or `null`. On `null`, the assistant
  shows the chips plus "maybe you meant…" (top 3).
- `answers.ts`: plain `fetch` with an `unwrap`-like 503 handling, copied in miniature from `apps/web/src/lib/api.ts` with no Zod.
  Each answer is built from the response fields with `?.`/`??` and never trusts the shape.
  - `apps/web/src/lib/api.ts` holds every URL; the assistant imports only its path builders if they are Zod-free.
    Otherwise it gets its own tiny `endpoints.ts`.
  - Only these endpoints: `/api/plate/:p`, `/api/plate/:p/history`, `/api/vin/:v`, `/api/wanted`, `/api/nhtsa/recalls`,
    `/api/rdw`, `/api/rdw/recalls`.
  - **Embed mode never calls** scraped-source endpoints (safety/NCAP, vdb, mot, photos, reviews, market, wiki).
    Those become link-out buttons.
- `element.ts`: the `CarsuaAssistant extends HTMLElement` custom element.
  - Attributes: `view`, `lang`, `theme`, `q`, `embedded`.
  - It renders a message list of `<article>`s plus chips, writes answers as text nodes (no `innerHTML` with data), and keeps
    the conversation in memory only.
- `strings.ts`: imports `virtual:assistant-strings`. This is a small Vite plugin in `vite.config.ts` that picks only the
  `assistant.*` and `about.feature.*` keys from `src/i18n/{ua,ru,en}.json` at build time. There is one source of strings, and the
  5.5k-key dictionaries are never shipped to the widget.
- `assistant.css`: imported as `?inline` into the Shadow DOM. It uses oklch/P3 tokens with an sRGB fallback (memory rule) and
  supports light/dark via the `theme` attribute or `prefers-color-scheme`.
- Colocated tests: `match.test.ts` (ua/ru/en phrases → intent, plate/VIN extraction, Latin-letter plates) and `answers.test.ts`
  (fixture responses → answer text, embed mode never requests a scraped endpoint).

### Shared package

- Add a `"./plate"` subpath export to `packages/shared/package.json`. It points at `dist/plate.js`, which has no imports, so the
  widget imports `classifyQuery` / `normalizePlate` / `isVin` without pulling in the barrel of Zod schemas. The same pattern as
  `./releases` already exists. Then run `pnpm --filter @carplates/shared build`.
- Region names come from the `/api/plate` response (`region`). The widget does not bundle `regions.ts`.

### Pages and build (`apps/web/vite.config.ts`)

- **Entry:** add `apps/web/embed/assistant.html` as a second input next to `index.html`. It is a minimal HTML shell containing
  `<carsua-assistant>`, with no `preloadHints` injection.
- **Size check:** confirm the widget chunk pulls none of the `VENDOR_GROUPS` (react/query/i18n/zod). If the code-splitting groups
  pull them in, add a guard test or a build-size check.
- **PWA:** add `/embed/` to `navigateFallbackDenylist` and the widget chunks to `globIgnores`, like `telegram-frame.html`.
- **Loader:** `apps/web/public/embed.js` is hand-written vanilla code, ~1.5 KB, at a stable unhashed URL.
  - It reads `data-view`, `data-lang`, `data-theme`, `data-position`, `data-q` from its own `<script>` tag.
  - `view=chat` draws a floating button; the iframe is created on click.
  - `view=search|badge` inserts an inline iframe in place of the script, with `loading="lazy"`.
  - It handles `postMessage` resize/close and checks `event.origin === 'https://carsua.app'`.

### In-app launcher

- New `apps/web/src/components/AssistantLauncher.tsx` (default export) is mounted once in `App.tsx`.
  - It renders a small fixed button.
  - On the first click it runs `import('@/assistant/element')` and shows `<carsua-assistant view="chat" lang={current}>` in a native
    `<dialog>`.
  - Open/closed state stays in `useState`.
- In-app (non-embedded) mode, links navigate inside the SPA (the element dispatches a `carsua:navigate` CustomEvent and the
  launcher calls `navigate`). On the current result page the plate is pre-filled from the route.
- In-app mode may also offer the extra link-out sections. Whole data stays in the full card, so the assistant links to sections
  rather than duplicating them.

### API / infra (embedding allowed for `/embed/*` only)

- `apps/api/src/main.ts:39`: skip `x-frame-options` when `req.url` starts with `/embed/`. That path covers static files from
  `WEB_DIST_DIR` via the SPA controller; verify that `embed/assistant.html` is served as a file, not caught by the catch-all.
  Plain `/embed/assistant` → serve `embed/assistant.html`.
- `infra/Caddyfile`: add a path-specific `header /embed/*` CSP block, like the `/telegram-frame.html` one, declared after the
  site-wide block:
  ```
  default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors *; form-action 'self';
  script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; report-uri /api/csp-report
  ```
  - The same rename caveat applies (Report-Only → enforced).
  - `embed.js` needs `Access-Control-Allow-Origin: *` only if loaded as a module. Load it as a classic script, so nothing is needed.
- **CORS, `OriginGuard`, throttles:** unchanged. All calls are same-origin GETs from inside the iframe, and the existing per-IP
  throttles apply to embed users too.
- **Why framing is safe:** the embed page has no state-changing actions and no auth UI, so there is no clickjacking surface.
- **Edge cache:** `embed/assistant.html` and `embed.js` get short `Cache-Control` (e.g. 1 h browser, 1 day edge) plus a Cloudflare
  Cache Rule entry (`docs/checklists.md` "Edge cache"). The hashed chunks already get the immutable cache.
- **Usage tracking:** count embeds per host from the `Referer` of `/embed/assistant` requests in the existing logs (no new
  tracking script in the widget).

### Public route for the integration instructions

- `/assistant` (or `/embed`) is a docs page for site owners. It shows a live preview, a view/lang/theme picker, and copy-paste
  snippets: script loader, plain iframe, zero-JS form. Also a short "what data is shown and attribution" note.
- Follow the `docs/checklists.md` "New public route" item: `ROUTE_TITLE_KEYS`, a `STATIC_PAGES` entry in
  `apps/api/src/spa/spa-text.ts`, `max-w-6xl`, and a line in `apps/web/public/llms.txt`.

### i18n

- Add `assistant.*` keys (intents, chips, answer templates, errors, launcher label) to `ua.json`/`ru.json`/`en.json`.
- User-visible strings use "-", not "—".

### Docs and release (per `docs/checklists.md`)

- `docs/features-reference.md`: a new "## Assistant and embed widget (2026-11-xx)" section covering:
  - the intent catalog rule: a new feature means a new intent, or at least an `about.feature.*` key
  - the embed data rule: open data only
  - the `/embed/*` header exceptions
- Also: `plan-done.md`, a ✅ line in `PLAN.md` plus "After deploy" boxes (Caddyfile CSP block, CF Cache Rule, check that framing
  works from a test page), `releases.ts` (`new` item ua/ru/en, bump the day `version`, `latest.ts`), and `AboutRoute.tsx` `FEATURES`.

## Other ideas to discuss later (not in the plan above)

- **Embed allowlist:** a `PARTNER_ORIGINS` env list in place of `frame-ancestors *`. More control, but every partner needs an env
  change.
- **Embed data variants:**
  - "same as the app": all sections. Legal risk for scraped sources.
  - "minimal teaser": make/model/year/region + a link-out. Maximum traffic back to carsua.app.
- **A dedicated `/assistant` full-page route** in the app, next to the floating launcher (same element).
- **Partner API keys / a public JSON API:** declined for now. CORS stays closed, per-vehicle data stays out of the public OpenAPI.
- **WebMCP** (`navigator.modelContext.registerTool`) for public stats/catalog only. **A real MCP server** only if we want AI agents
  (Claude/ChatGPT) to query us. Not needed for the widget.
- **More views:**
  - a "share this card" mini-card for forums (static HTML + OG image, no JS)
  - a Telegram/Viber bot reusing the same intent engine (`intents`/`match`/`answers` are framework-free, so they could move into
    `packages/shared` later)
- **Hybrid AI later:** only as a fallback when no intent matches (rephrase → intent id), never to generate car facts.
- **Per-host analytics** from `Referer` logs; an optional `data-partner` attribute for attribution.

## Phasing

1. Engine (`intents`, `match`, `answers`, strings plugin) plus tests.
2. Custom element and the in-app launcher. This ships value in-app first.
3. Embed page, `embed.js`, API header exception, Caddyfile, and the PWA denylist.
4. The `/assistant` integration page and the docs/release items.

## Local testing

**Needed for local testing:**

- `embed.js` does not hard-code `https://carsua.app`. It derives `ORIGIN` from `new URL(document.currentScript.src).origin`, and
  checks `postMessage` against that origin. So the same snippet works against `localhost`, stage and prod.
- Commit a test host page, `apps/web/dev/embed-test.html` (outside `public/`, so it never ships). It contains the 3 snippets
  (chat launcher, inline search, badge) plus the plain-iframe and zero-JS form variants, and has some dummy page content.

**A. Dev mode (fast loop, HMR):**

1. Run `pnpm dev` (API :3000 + Vite :5173, with `/api` proxied).
2. In-app: open `http://localhost:5173`, click the launcher, ask questions.
3. Widget alone: open `http://localhost:5173/embed/assistant?view=chat&lang=ua`.
4. Cross-origin embed:
   - Open the test host at `http://127.0.0.1:5173/dev/embed-test.html`. Its snippets point at `http://localhost:5173/embed.js`.
   - `127.0.0.1` and `localhost` are **different origins**, so this is a real third-party embed without a second server.
   - If `127.0.0.1` doesn't answer on Windows (Vite bound to `::1`), start Vite with `--host 127.0.0.1` or set
     `server.host` in dev.
5. Dev mode does **not** test production headers: Vite serves the page without `X-Frame-Options`/CSP.

**B. Production build through the API (tests the header exception):**

1. Run `pnpm --filter web build`, then start the API with `WEB_DIST_DIR` pointing at `apps/web/dist`.
2. Use the test host as above, but with snippets against `http://localhost:3000/embed.js`.
3. `curl -I http://localhost:3000/embed/assistant` must show no `x-frame-options`. `curl -I http://localhost:3000/` must show
   `SAMEORIGIN`.
4. Negative check: the test host iframing `http://localhost:3000/` (the app itself) must be blocked by the browser.

**C. CSP (Caddy-only header):** it can't run without Caddy locally, so check it on **stage** after deploy:

- the browser console on the test host shows no `frame-ancestors` report
- `/api/csp-report` / Sentry receives nothing new for `/embed/*`

This becomes a PLAN.md "After deploy" box.

**D. Automated checks:** with Chrome DevTools MCP on the test host:

- Before any click: `list_network_requests` shows only `embed.js`, and there is no iframe.
- After clicking: `take_snapshot` shows the iframe, the answers render, and resize works.
- Throughout: `list_console_messages` is clean.
- With `emulate` mobile: the launcher doesn't overlap, and the panel is full-screen on narrow widths.
- `lighthouse_audit` on the test host gives the before-click impact.

## Verification

- `pnpm --filter @carplates/shared build`, `pnpm format`, Vitest for `match.test.ts` / `answers.test.ts` and the existing
  `public-doc.test.ts` / releases tests.
- `pnpm --filter web build`. Then check:
  - the `embed/assistant` chunk sizes (≤ 15 KB gz JS)
  - the widget chunk does not import vendor-react / vendor-zod
  - `dist/embed/assistant.html` exists
  - the SW precache manifest has no embed chunks
- Run the dev stack with the `run` skill. Then:
  - In the app, open the launcher. Ask "чий номер АА1234ВВ?", "скільки власників", "чи в розшуку", and a VIN decode. Check that
    deep links open the right `?section=`.
  - Embed check: a scratch `test-host.html` on another port contains the `embed.js` snippet for all 3 views. In Chrome DevTools
    MCP, confirm the button appears with no iframe until click, the iframe loads, resize works, and no console/CSP errors appear.
  - The Network tab shows only allowed endpoints in embed mode.
  - Lighthouse on the test host shows near-zero impact before the click.
- `curl -I` `/embed/assistant`: it has no `x-frame-options`. `curl -I /`: it still has `SAMEORIGIN`.
