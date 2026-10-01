import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import ArSearchButton from '@/components/ArSearchButton'
import CameraSearchButton from '@/components/CameraSearchButton'
import PhotoSearchButton from '@/components/PhotoSearchButton'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
type Props = {
  initialValue?: string
  autoFocus?: boolean
  isRecognizing: boolean
  recognizeErrorKey: string | null
  onPickPhoto: (file: File) => void
}

export default function SearchField({
  initialValue = '',
  autoFocus = true,
  isRecognizing,
  recognizeErrorKey,
  onPickPhoto
}: Props): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const [value, setValue] = useState(initialValue)

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
    if (q) navigate(`/${encodeURIComponent(q)}`)
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-1">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          name="carplate-search-query"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={t('search.placeholder')}
          aria-label={t('search.placeholder')}
          autoFocus={autoFocus}
          autoComplete="on"
          className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            className="rounded-lg bg-[var(--color-surface)]/20 px-3 py-2 text-[var(--color-fg)] hover:text-[var(--color-primary)]"
          >
            {t('search.clear')}
          </button>
        )}
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-[var(--color-primary-fg)] hover:opacity-90"
        >
          {t('search.button')}
        </button>
      </form>
      <div className="flex justify-center gap-2">
        <PhotoSearchButton isPending={isRecognizing} disabled={!online} onPick={onPickPhoto} />
        <CameraSearchButton isPending={isRecognizing} disabled={!online} onCapture={onPickPhoto} />
        <ArSearchButton disabled={!online} />
      </div>
      {recognizeErrorKey && <p className="text-sm text-[var(--color-muted)]">{t(recognizeErrorKey)}</p>}
    </div>
  )
}
