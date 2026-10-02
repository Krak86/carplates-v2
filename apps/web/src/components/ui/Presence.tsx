import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

const EXIT_MS = 300

type Props = {
  show: boolean
  children: ReactNode
}

/** Smooth expand + fade on appear and disappear. Keeps the last shown content mounted while it animates out. */
export default function Presence({ show, children }: Props): ReactNode {
  const [lastChildren, setLastChildren] = useState(children)
  const [mounted, setMounted] = useState(show)
  const [entered, setEntered] = useState(false)

  if (show && lastChildren !== children) setLastChildren(children)

  useEffect(() => {
    if (show) {
      const id = requestAnimationFrame(() => {
        setMounted(true)
        setEntered(true)
      })
      return (): void => cancelAnimationFrame(id)
    }
    const timer = setTimeout(() => {
      setEntered(false)
      setMounted(false)
    }, EXIT_MS)
    return (): void => clearTimeout(timer)
  }, [show])

  if (!show && !mounted) return null

  const visible = show && entered

  return (
    <div
      className={cn(
        'grid w-full justify-items-center transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out motion-reduce:transition-none',
        // -mt-6 cancels the parent's gap-6 while collapsed, so unmounting causes no layout jump.
        visible ? 'mt-0 grid-rows-[1fr] opacity-100' : '-mt-6 grid-rows-[0fr] opacity-0'
      )}
    >
      <div className="flex min-h-0 w-full flex-col items-center overflow-hidden">{show ? children : lastChildren}</div>
    </div>
  )
}
