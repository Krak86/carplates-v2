import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { resolveFuelCategories } from '@carplates/shared'

import { OPEN_ELECTRIC_EVENT } from '@/components/OpenEv.helpers'
import { openEvQuery } from '@/lib/queries'

type Props = {
  brand: string | null
  model: string | null
  fuel: string | null
}

/**
 * 🔌 button next to an electric car's fuel: opens the Electric block and scrolls to it. Rendered only when the block
 * has data for the model (same cached query as the block itself), so the click never leads nowhere.
 */
export default function ElectricLink({ brand, model, fuel }: Props): ReactNode {
  const { t } = useTranslation()
  const [, setSearchParams] = useSearchParams()
  const isElectric = resolveFuelCategories(fuel).includes('electric')
  const { data } = useQuery({ ...openEvQuery(brand ?? '', model ?? ''), enabled: !!(brand && model) && isElectric })
  if (!isElectric || !data?.match) return null

  // A mounted block listens for the event; an unmounted (lazy) one mounts and opens from the `?section=electric` param.
  const handleClick = (): void => {
    window.dispatchEvent(new Event(OPEN_ELECTRIC_EVENT))
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        next.set('section', 'electric')
        return next
      },
      { replace: true }
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={t('ev.link')}
      aria-label={t('ev.link')}
      className="rounded px-1 hover:bg-[var(--color-border)]/60"
    >
      <span aria-hidden>🔌↓</span>
    </button>
  )
}
