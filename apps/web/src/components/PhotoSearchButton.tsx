import { useRef } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Spinner from '@/components/ui/Spinner'

type Props = {
  isPending: boolean
  onPick: (file: File) => void
}

export default function PhotoSearchButton({ isPending, onPick }: Props): ReactNode {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onPick(file)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[var(--color-muted)] hover:text-[var(--color-fg)] disabled:opacity-50"
      >
        {isPending ? <Spinner /> : <span aria-hidden>📷</span>}
        {t('search.byImage')}
      </button>
    </>
  )
}
