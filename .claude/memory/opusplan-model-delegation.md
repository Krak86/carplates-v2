---
name: opusplan-model-delegation
description: 'carplates-v2 uses opusplan (Opus for planning, Sonnet for execution) configured in .claude/settings.local.json'
metadata:
  node_type: memory
  type: project
  originSessionId: dbcca3aa-280a-4839-a590-69658666c869
  modified: 2026-09-08T16:00:34.547Z
---

This repo is configured to plan with Opus and execute with Sonnet automatically, via the built-in `opusplan` model alias — not a custom hook or workspace setup. Configured in the project-local, gitignored `.claude/settings.local.json` (not the committed `.claude/settings.json`, which stays team-neutral): `"model": "opusplan"`, `"env": {"CLAUDE_CODE_SUBAGENT_MODEL": "sonnet"}` (subagents default to Sonnet too), and `PostModelSwitch` hooks that print `-> Sonnet (execution)` / `-> Opus (planning)` when the switch happens, so the handoff is visible rather than silent.

Also added, at user scope (`~/.claude/commands/`, so available in every project, not just this repo): `/implement` (forces Sonnet for one turn) and `/hard` (forces Opus for one turn) — both are single-turn overrides only, the session model reverts on the next prompt.

**Why:** the user wanted to plan with the strongest model and delegate implementation to a cheaper one without manually switching every time. `opusplan` does this natively; no hooks or workspaces were needed for the core behavior (a plan-approval hook doesn't exist and hooks can't change the session model anyway — they can only observe or block a switch).

**How to apply:** if `.claude/settings.local.json` needs edits, the user has to make them directly — a deny rule (`Read(.claude/settings.local.json)` in the committed `.claude/settings.json`) blocks me from reading or writing that file. See [[recheck-plan-after-clarifying-questions]] for a related but separate plan-mode habit added around the same time.
