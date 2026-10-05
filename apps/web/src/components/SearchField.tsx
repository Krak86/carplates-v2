import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'

import ArSearchButton from '@/components/ArSearchButton'
import CameraSearchButton from '@/components/CameraSearchButton'
import PhotoSearchButton from '@/components/PhotoSearchButton'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'

type Props = {
  initialValue?: string
  autoFocus?: boolean
  isRecognizing: boolean
  onPickPhoto: (file: File) => void
}

export default function SearchField({
  initialValue = '',
  autoFocus = true,
  isRecognizing,
  onPickPhoto
}: Props): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [value, setValue] = useState(initialValue)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // The route's query changed (home, plate -> VIN, photo recognition landing on a plate…):
  // reset the input to it, dropping whatever was typed. Derived during render, not an effect.
  const [syncedValue, setSyncedValue] = useState(initialValue)
  if (syncedValue !== initialValue) {
    setSyncedValue(initialValue)
    setValue(initialValue)
  }

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    const q = value.trim()
    if (q) navigate(`/${encodeURIComponent(q)}`, { viewTransition: true })
  }

  return (
    <div className="search-vt flex w-full flex-col gap-1">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="group relative min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setAdvancedOpen(open => !open)}
            aria-expanded={advancedOpen}
            aria-controls="advanced-search-link"
            aria-label={t('search.advancedToggle')}
            className="absolute inset-y-0 left-0 flex w-9 items-center justify-center rounded-l-lg text-[var(--color-muted)] hover:text-[var(--color-primary)]"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className={cn(
                'h-5 w-5 transition-transform duration-300 motion-reduce:transition-none',
                advancedOpen && 'rotate-45'
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute top-full left-0 z-10 mt-1 w-max max-w-[min(20rem,80vw)] rounded-md bg-[var(--color-fg)] px-2 py-1 text-left text-xs text-[var(--color-bg)] opacity-0 shadow transition-opacity delay-300 duration-150 group-has-[button:focus-visible]:opacity-100 group-has-[button:hover]:opacity-100"
          >
            {t('search.advancedToggle')}
          </span>
          <input
            name="carplate-search-query"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            autoFocus={autoFocus}
            autoComplete="on"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pr-9 pl-9 outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="button"
            onClick={() => setValue('')}
            inert={!value}
            aria-label={t('search.clear')}
            title={t('search.clear')}
            className={cn(
              'absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-[var(--color-muted)] transition-opacity duration-200 hover:text-[var(--color-primary)] motion-reduce:transition-none',
              value ? 'opacity-100' : 'pointer-events-none opacity-0'
            )}
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-[var(--color-primary-fg)] hover:opacity-90"
        >
          {t('search.button')}
        </button>
      </form>
      <div
        id="advanced-search-link"
        inert={!advancedOpen}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none',
          advancedOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <Link
            viewTransition
            to="/advanced-search"
            className="text-sm text-[var(--color-primary)] underline hover:no-underline"
          >
            {t('advancedSearch.viewLink')}
          </Link>
        </div>
      </div>
      <div className="flex justify-center gap-1.5">
        <PhotoSearchButton isPending={isRecognizing} disabled={!online} onPick={onPickPhoto} />
        <CameraSearchButton isPending={isRecognizing} disabled={!online} onCapture={onPickPhoto} />
        <ArSearchButton disabled={!online} />
      </div>
    </div>
  )
}
