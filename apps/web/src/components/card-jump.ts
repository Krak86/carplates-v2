import { createContext, use } from 'react'

import type { JumpTarget } from '@/components/RdwSpecs.helpers'

/** The result card's "open that section and scroll to it" action; null outside the card (VIN page), where links hide. */
export const CardJumpContext = createContext<((target: JumpTarget) => void) | null>(null)

export const useCardJump = (): ((target: JumpTarget) => void) | null => use(CardJumpContext)
