import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

type Props = {
  initialValue?: string
}

export default function SearchField({ initialValue = '' }: Props): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [value, setValue] = useState(initialValue)

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    const q = value.trim()
    if (q) navigate(`/${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl gap-2">
      <input
        name="carplate-search-query"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={t('search.placeholder')}
        aria-label={t('search.placeholder')}
        autoFocus
        autoComplete="on"
        className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="rounded-lg px-3 py-2 text-[var(--color-muted)] hover:text-[var(--color-fg)]"
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
  )
}
