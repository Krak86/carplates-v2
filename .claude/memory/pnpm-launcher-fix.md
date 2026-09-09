---
name: pnpm-launcher-fix
description: "This machine's global pnpm launcher was repointed from a broken 10→12 self-management shim to pnpm 12.3.4 directly"
metadata:
  node_type: memory
  type: project
---

`packageManager` in the repo pins `pnpm@12.3.4`. On this Windows machine the
standalone pnpm 10.20.0 install's self-management shim (`%LOCALAPPDATA%\pnpm\pnpm`

- `pnpm.CMD`) builds a broken command when handing off to pnpm 12's new file
  layout (`... is not recognized as an internal or external command`), and
  `pnpm self-update` / `pnpm add -g pnpm` both refuse. pnpm 10 also cannot read the
  pnpm-12-written `pnpm-lock.yaml` (`ERR_PNPM_BROKEN_LOCKFILE`, despite
  `lockfileVersion: '9.0'`).

**Fix applied:** the two launcher scripts were backed up (`pnpm.bak`,
`pnpm.CMD.bak`) and rewritten to exec
`.tools/pnpm/12.3.4/node_modules/pnpm/bin/pnpm.mjs` directly — which is what a
working `pnpm self-update` would have produced. `pnpm -v` now prints `12.3.4` and
`pnpm --filter` / nested workspace scripts work. Also created
`%LOCALAPPDATA%\pnpm\config\rc` with `manage-package-manager-versions=false`
(now redundant, harmless).

**How to apply:** if `pnpm` breaks again after a pnpm reinstall, re-apply the
same launcher rewrite, or install a matching pnpm globally another way. Nothing
in the repo needs to change.
