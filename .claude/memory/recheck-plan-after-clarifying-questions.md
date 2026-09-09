---
name: recheck-plan-after-clarifying-questions
description: 'In plan mode, re-verify the draft plan against AskUserQuestion answers before calling ExitPlanMode'
metadata:
  node_type: memory
  type: feedback
  originSessionId: dbcca3aa-280a-4839-a590-69658666c869
  modified: 2026-09-08T16:00:27.486Z
---

When planning in this project, if I use AskUserQuestion to ask clarifying questions mid-plan, once the answers come back I must explicitly re-check the current draft plan against those answers before calling ExitPlanMode — not just fold the answers in and move on. Concretely: re-read the plan file, confirm each answer is actually reflected in it (not contradicted or left stale from before the question was asked), and decide whether any section needs to be reworked. If something doesn't fit, revise the plan first rather than exiting with a mismatch.

**Why:** answers to clarifying questions can change the shape of the plan (a different approach, a different scope, a file the plan hadn't accounted for), and it's easy to bolt the answer onto one paragraph while leaving an earlier section that assumed the opposite. Getting the user's plan-mode approval on a plan that quietly contradicts their own answer wastes the round trip and their trust in the approval step.

**How to apply:** treat this as a mandatory step of Phase 3 (Review) in the plan-mode workflow — after AskUserQuestion returns, before writing the final plan file and calling ExitPlanMode, do one pass comparing plan content to each answer given. This is a self-enforced habit (memory only, not a hook) — see [[opusplan-model-delegation]] for why hook enforcement was considered and declined in favor of this.
