# CLAUDE_RULES.md

Lint (`pnpm lint`) and Prettier already enforce formatting, imports, console, `useStore`, `forwardRef`, `../` in `apps/web`, Drizzle `.where`, TanStack Query rules. Below: what they do **not** catch.

## Environment

**No Python on this machine.** For bulk or scripted edits use the Edit tool (`replace_all` where it fits), or a Node/`tsx`
one-off — never `python`/`python3`. Don't announce this each time; just do it. pnpm here forwards a literal `--`: run
`pnpm ingest:mot --dir …`, not `pnpm ingest:mot -- --dir …`.

## Code standards

- **`apps/api` runs on `tsx watch` (esbuild): no `design:paramtypes`**, Nest silently injects `undefined`. Every constructor-injected
  dependency (controllers and services) needs an explicit `@Inject(Token)`:
  `constructor(@Inject(FooService) private readonly foo: FooService) {}`. `consistent-type-imports` is off in `apps/api` for this.
- Statics → `feature/helpers.ts` + `feature/types.ts`; side effects / data fetching → a `use-[feature]-actions.ts` hook.
- **A literal union + its runtime list: derive one**, `as const` array + `type X = (typeof XS)[number]`. **`DEFAULT_*` stay explicit,
  never `LIST[0]`** (order is presentation, the default is semantics).
- URLs / env vars live in one module (`apps/web/src/lib/api.ts`, `apps/api/src/env.ts`). Remove unused code.
- Zod for **all** cross-boundary data (API responses, env, CSV rows, route params); `?.` / `??` for anything that crossed one.
- `!!value` for a positive check, `!value` for a negative. Event handlers `handleX`; constants `CONSTANT_CASE`; props type is
  always `Props`; `type` over `interface`.
- Components (`apps/web`): default export, one per file; complex ones → sub-components + a hook; semantic HTML, blank lines between
  JSX blocks; React 19 ref-as-prop (`ref?: React.Ref<T>`, `React.ComponentRef<T>`).
- State: Zustand (`useUiStore`, ~3 fields, always a selector) = shared UI state; TanStack Query = all server state, `queryOptions()`
  co-locating key + fn; `useState` = local only.
- `@types/*` majors must match the runtime package's major.
- Tailwind v4, CSS-first: tokens in the `@theme` block of `apps/web/src/styles/global.css`, no `tailwind.config`, no v3 directives (`@tailwind base`, `@screen`, `theme()`, `safelist`); `!important` is a trailing bang. Light default, `[data-theme='dark']` tokens, no toggle.

## Performance (React Compiler)

- **Derive during render** when computable from props/state — no `useState` + `useEffect` pair.
- Effects are for external systems (localStorage, DOM, SDKs) only. **No synchronous `setState` in an effect body** and **no ref
  reads/writes during render** (both lint rules are off — enforce by hand). A `setTimeout` effect returns `clearTimeout`.
- Write values/functions plain (the compiler memoizes). Keep `useMemo`/`useCallback` only for narrower deps, imperative consumers
  or compiler-skipped components — and then with complete deps (`preserve-manual-memoization` is an error).
