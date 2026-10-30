import { useRef } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { SEARCH_BUTTON_CLASS, SEARCH_BUTTON_ICON_CLASS } from '@/components/search-button-styles'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'

type Props = {
  isPending: boolean
  disabled?: boolean
  highlight?: boolean
  onPick: (file: File) => void
}

export default function PhotoSearchButton({
  isPending,
  disabled = false,
  highlight = false,
  onPick
}: Props): ReactNode {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onPick(file)
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending || disabled}
        title={disabled ? t('offline.needsConnection') : undefined}
        className={cn(SEARCH_BUTTON_CLASS, highlight && 'search-focus')}
      >
        {isPending ? (
          <span className={SEARCH_BUTTON_ICON_CLASS}>
            <Spinner />
          </span>
        ) : (
          <span aria-hidden className={SEARCH_BUTTON_ICON_CLASS}>
            📷
          </span>
        )}
        {t('search.byImage')}
      </button>
    </>
  )
}
