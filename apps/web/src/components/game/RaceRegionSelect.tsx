import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

import RegionFlag from '@/components/RegionFlag'
import { cn } from '@/lib/cn'

type Props = {
  label: string
  value: string
  options: readonly string[]
  onChange: (region: string) => void
}

/**
 * A region picker whose options carry their flags (a native select cannot show images). Arrow keys, Home/End, Enter and
 * Escape work as in a select; they are stopped here so the car does not steer while the list is open.
 */
export default function RaceRegionSelect({ label, value, options, onChange }: Props): ReactNode {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const list = options.includes(value) ? options : [value, ...options]

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: PointerEvent): void => {
      if (e.target instanceof Node && !rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const handleToggle = (): void => {
    setActive(Math.max(0, list.indexOf(value)))
    setOpen(!open)
  }

  const handlePick = (region: string): void => {
    onChange(region)
    setOpen(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape']
    if (!keys.includes(e.key)) return
    e.stopPropagation()
    e.preventDefault()
    if (!open) {
      if (e.key !== 'Escape') handleToggle()
      return
    }
    if (e.key === 'ArrowDown') setActive(Math.min(list.length - 1, active + 1))
    else if (e.key === 'ArrowUp') setActive(Math.max(0, active - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(list.length - 1)
    else if (e.key === 'Escape') setOpen(false)
    else handlePick(list[active] ?? value)
  }

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={handleToggle}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-left"
      >
        <RegionFlag region={value} />
        <span className="min-w-0 flex-1 truncate">{value}</span>
        <span aria-hidden className="text-xs opacity-60">
          ▾
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg"
        >
          {list.map((name, i) => (
            <li
              key={name}
              role="option"
              aria-selected={name === value}
              onClick={() => handlePick(name)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center gap-2 px-2 py-1',
                i === active && 'bg-[var(--color-primary)]/15',
                name === value && 'font-semibold text-[var(--color-primary)]'
              )}
            >
              <RegionFlag region={name} />
              <span className="min-w-0 truncate">{name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
