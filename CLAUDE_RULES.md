# CLAUDE_RULES.md

Team coding standards + performance rules. Auto-loaded via @import in CLAUDE.md.
To save tokens, comment out `@CLAUDE_RULES.md` in CLAUDE.md.

## Code Standards

**Formatting** (enforced by `.prettierrc`): tabWidth 2, singleQuote, no semi,
printWidth 120, trailingComma none, arrowParens avoid.

**Imports order:** 1) node builtins → 2) external packages (incl. `@carplates/*`
workspace pkgs) → 3) internal (`@/…`, relative) → 4) styles. `import-rules/no-external-after-internal`
warns on violations; side-effect imports (`import './x'`) are position-exempt.

**Structure:**

- Side effects / data-fetching wiring → a `use-[feature]-actions.ts` hook, kept out of the component.
- Statics → `feature/helpers.ts` (functions) + `feature/types.ts` (types).
- **A literal union + its runtime list: derive one, never write both.** Declare
  the array `as const`, derive the type: `export type X = (typeof XS)[number]`.
  Writing both drifts silently — a union member missing from the array is legal
  everywhere in types but absent from the UI. Not violations: already-derived
  types (`keyof X`), and arrays that are a deliberate subset of the union.
- **`DEFAULT_*` constants stay explicit — never `LIST[0]`.** Order is
  presentation; the default is semantics. Deriving one from the other turns a
  reorder into a silent behaviour change.
- URLs / env vars → a single module (`apps/web/src/lib/api.ts` base, `apps/api/src/env.ts`), not scattered.
- Remove unused code; comment out with `//` only if genuinely unsure.

**Error handling:**

- Never raw `console.*` in app code (`console-rules/no-raw-console`). Use the
  NestJS `Logger` in `apps/api`; a thin wrapper in `apps/web`. `scripts/**` (CLIs) are exempt.
- `!!value` for a positive check · `!value` for a negative check.
- Zod for **all** external / cross-boundary data (API responses, env, CSV rows, route params).
- `?.` optional chaining + `??` nullish coalescing for anything that crossed a boundary.

**Naming:**

- Event handlers: `handle` prefix (`handleSubmit`, `handleOpenChange`).
- Constants: `CONSTANT_CASE`.
- Props type: always `Props` (not `ComponentNameProps`).
- Prefer `type` over `interface`.

**Components (apps/web):**

- Default exports. One component per file.
- Complex components → decompose into sub-components + extract logic to a hook.
- Empty lines between logical JSX blocks · semantic HTML.
- **React 19: no `forwardRef`** (`no-restricted-syntax` blocks it) — use
  ref-as-prop: `ref?: React.Ref<T>` in `Props`. Use `React.ComponentRef<T>`, not `ElementRef`.

**State (apps/web):**

- **Zustand** (`useUiStore`) → shared client/UI state (lang, theme, drawer). Only ~3 fields today.
  Never a bare `useStore()` — always pass a selector (`store-rules/no-bare-usestore`).
- **TanStack Query** → all server state. Co-locate `queryKey` + `queryFn` via
  `queryOptions()` (`@tanstack/query/prefer-query-options`). Query keys don't need memoization.
- **`useState`** → local single-component state only.

**ESLint-enforced:**

- Inline type imports: `import { type Foo } from 'bar'` (`consistent-type-imports`).
  **Off in `apps/api`** — constructor-injected types must stay runtime value imports (see below).
- **`apps/api` runs on `tsx watch` (esbuild), which never emits `design:paramtypes`** —
  esbuild has no type checker, so `emitDecoratorMetadata` can't reflect constructor
  param types the way `tsc` does. Nest then silently injects `undefined` instead of
  throwing. Every constructor-injected dependency in `apps/api` **must** carry an
  explicit `@Inject(Token)`: `constructor(@Inject(FooService) private readonly foo: FooService) {}`.
  Applies to controllers and services alike. Property-based injection isn't exempt
  either — it never worked off reflection in the first place.
- No explicit `any` (warns). Type fields explicitly.
- No parent-relative (`../`) imports in `apps/web` — use `@/`. (Node ESM code in
  `api`/`db`/`scripts` legitimately uses `../` and is exempt.)
- **No phantom dependencies** — every imported package must be in the nearest
  `package.json` (`import-x/no-extraneous-dependencies`, `includeTypes: true`, so
  `@types/x` alone doesn't cover an `import type … from 'x'`). Add the dep, don't silence.
- `@types/*` majors must match the runtime package's major.
- TanStack Query lint family is all `error` except `exhaustive-deps` (off).
- Drizzle: `apps/api` bans `.delete()` / `.update()` without `.where()`.
- Manual `useMemo`/`useCallback` must have correct deps —
  `react-hooks/preserve-manual-memoization` is `error` (a wrong dep array makes
  the compiler bail on the whole component).

**Styling — Tailwind v4 (CSS-first):**

The theme lives in the `@theme` block at the top of
[apps/web/src/styles/global.css](apps/web/src/styles/global.css). No
`tailwind.config`. Light is the committed default; `[data-theme='dark']` tokens
are wired but there's no UI toggle yet.

- Use v4 directives: `@theme`, `@utility`, `@custom-variant`, `@plugin`, `@import 'tailwindcss'`, `@source`.
- **Removed in v4 — never emit:** `@tailwind base/components/utilities`, `@screen`, `theme()`, `safelist`.
- `!important` is the trailing bang: `@apply inline-block!` (not `!important`).
- Keyframes go top-level, not inside `@theme`.
- Class names written in `.md` files and CSS comments are **not** scanned.

## Performance Rules

**Zustand selectors (CRITICAL):** never a zero-arg `useUiStore()`. 1 field →
`useUiStore(s => s.field)`; 2+ → a shallow-compared selector.

**V8 JIT stability:** no `any` in store slices · no `delete obj.prop` (use
`null`/`undefined`) · no try/catch in hot render paths · keep array element types consistent.

**Effects:**

- **Derive during render** whenever the value is computable from props/state —
  drop the `useState`+`useEffect` pair. Covers most cases.
- Real external-system sync (localStorage, DOM, an SDK) stays an effect — just
  don't call `setState` in the same body.
- **No synchronous `setState` in `useEffect`** (`react-hooks/set-state-in-effect`
  is off in lint to avoid legacy churn — enforce by hand on new/edited code).
  Last resort: gate behind a `useRef` flag.
- **No ref reads/writes during render** (`react-hooks/refs` off, same reason).
  Read `.current` in the effect/handler. If an effect must re-run when a node
  mounts, make the node a state value via a callback ref.
- `useEffect` with `setTimeout` → `return () => clearTimeout(t)`.

**Memoization (React Compiler-aware):** default to writing values/functions
plain — the compiler auto-memoizes. Keep a manual `useMemo`/`useCallback` only
when you need narrower deps than inferred, or the value feeds an
imperative/non-React consumer, or the component is compiler-skipped. If you keep
one, deps must be complete.

**Lists:** virtualize 50+ rows. (Not needed anywhere in Phase 1.)
