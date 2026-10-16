import type { ReactNode } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import UaPlateBadge from '@/components/UaPlateBadge'
import { vehicleSearchQuery } from '@/lib/queries'

type Props = {
  brand: string
  model: string
}

const EXAMPLE_COUNT = 3

/**
 * "Show real plates": on demand, the newest registrations of one model from the live registry, as plate chips that open
 * the plate card. Nothing is requested until the button is pressed.
 */
export default function ExamplePlates({ brand, model }: Props): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data, isPending, isError } = useQuery({
    ...vehicleSearchQuery({
      brand,
      model,
      sort: 'makeYear',
      dir: 'desc',
      page: 1,
      pageSize: EXAMPLE_COUNT
    }),
    enabled: open
  })

  const handleToggle = (): void => setOpen(value => !value)

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={handleToggle}
        className="self-start rounded-full border border-border px-3 py-1 text-sm hover:bg-(--color-bg)"
      >
        <span aria-hidden>🔢</span> {open ? t('read.hidePlates') : t('read.showPlates')}
      </button>

      {open && (
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          {isPending && <span className="text-sm text-muted">{t('read.plates.loading')}</span>}
          {isError && <span className="text-sm text-muted">{t('read.plates.error')}</span>}
          {data && data.results.length === 0 && <span className="text-sm text-muted">{t('read.plates.empty')}</span>}

          {data?.results.map(row => (
            <Link
              key={row.plate}
              viewTransition
              to={`/${encodeURIComponent(row.plate)}`}
              className="inline-flex flex-col items-center gap-0.5"
              title={[row.makeYear, row.color].filter(Boolean).join(' · ')}
            >
              <UaPlateBadge plate={row.plate} />
              {row.makeYear && <span className="text-xs text-muted">{row.makeYear}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
