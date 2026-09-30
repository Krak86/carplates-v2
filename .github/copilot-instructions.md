# Copilot instructions

This repo's full guidance is shared with Claude Code — read these first:

- [CLAUDE.md](../CLAUDE.md) — what the project is, commands, layout, stack, conventions
- [CLAUDE_RULES.md](../CLAUDE_RULES.md) — code standards and performance rules
- [PLAN.md](../PLAN.md) — roadmap and the reasoning behind past decisions

Essentials:

- pnpm monorepo (`apps/web`, `apps/api`, `packages/shared`, `packages/db`, `scripts`). Node 24, ESM, TypeScript.
- Plate logic lives only in `@carplates/shared` (`normalizePlate`) — never re-implement it.
- `apps/api` constructor injection needs an explicit `@Inject(Token)` (tsx/esbuild emits no decorator metadata).
- `apps/web`: `@/` imports only, default-exported components, Zustand selectors (never bare `useUiStore()`),
  TanStack Query for server state, Tailwind v4 CSS-first.
- Prettier: 2 spaces, single quotes, no semicolons, printWidth 120, no trailing commas.
- Never run `pnpm db:seed` or any `TRUNCATE`/`DROP` against a DB holding a real ingest without asking first.
- Don't run `git commit`/`git push` unless asked; suggest a commit message instead.
