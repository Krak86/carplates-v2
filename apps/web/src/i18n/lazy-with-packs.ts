/* eslint-disable @typescript-eslint/no-explicit-any -- the same bound as React's own `lazy` */
import { lazy } from 'react'
import type { ComponentType } from 'react'

import { loadPacks } from './index'
import type { PackName } from './packs'

/** `lazy()` that also fetches the route's dictionary packs in parallel with its chunk, so the first render has no raw keys. */
export function lazyWithPacks<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  ...packs: PackName[]
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    const [module] = await Promise.all([importer(), loadPacks(packs)])
    return module
  })
}
