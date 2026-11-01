import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuctionStatsRow } from '@carplates/shared'

type Props = {
  id: string
  value: string | undefined
  makes: readonly AuctionStatsRow[]
  className: string
  onChange: (make: string) => void
}

/**
 * Make filter you can type into: the browser's own suggestion list narrows as you type. The filter is applied once the text
 * is exactly one of the makes (or cleared), not on every keystroke, so a half-typed name never empties the list.
 */
export default function AuctionMakeSearch({ id, value, makes, className, onChange }: Props): ReactNode {
  const { t } = useTranslation()
  const listId = `${id}-options`

  const commit = (text: string): void => {
    const typed = text.trim().toLowerCase()
    if (typed === '') {
      if (value) onChange('')
      return
    }
    const match = makes.find(m => m.label.toLowerCase() === typed)
    if (match && match.label !== value) onChange(match.label)
  }

  return (
    <>
      <input
        // Re-keyed by the applied value so "Reset" and the URL clear the text too.
        key={value ?? ''}
        id={id}
        type="search"
        list={listId}
        autoComplete="off"
        placeholder={t('auctions.page.any')}
        defaultValue={value ?? ''}
        onChange={e => commit(e.target.value)}
        onBlur={e => commit(e.target.value)}
        className={className}
      />
      <datalist id={listId}>
        {makes.map(m => (
          <option key={m.label} value={m.label} />
        ))}
      </datalist>
    </>
  )
}
