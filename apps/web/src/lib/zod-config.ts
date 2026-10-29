import { z } from 'zod'

// Zod's JIT probes `new Function` on every schema; a CSP without 'unsafe-eval' would flag each probe.
// Must be the first import of `main.tsx`: Zod reads `jitless` when a schema is *constructed* (module evaluation of
// `schemas.ts`), which runs before the body of `main.tsx`.
z.config({ jitless: true })
