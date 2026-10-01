import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'

import ArPlateCard from './ArPlateCard'
import type { useArPlateReader } from './use-ar-plate-reader'

type Props = {
  reader: ReturnType<typeof useArPlateReader>
  onNavigate: () => void
}

/** The AR camera's results: a chip per plate found (like the photo flow's "Also found"), and the picked plate's info. */
export default function ArPlateInfo({ reader, onNavigate }: Props): ReactNode {
  const { t } = useTranslation()
  const [auto, setAuto] = useState(true)
  const { plates, active, reading } = reader

  return (
    <div className="mt-3 flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted">
          {plates.length ? t('ar.found', { count: plates.length }) : reading ? t('ar.reading') : t('ar.pointAtPlate')}
          {!!plates.length && reading && ` · ${t('ar.reading')}`}
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />
            {t('ar.autoInfo')}
          </label>
          {!!plates.length && (
            <button
              type="button"
              onClick={reader.clear}
              className="rounded-full border border-border px-3 py-1 text-xs hover:border-muted"
            >
              ✕ {t('ar.clear')}
            </button>
          )}
        </div>
      </div>

      {plates.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {plates.map(plate => (
            <button
              key={plate}
              type="button"
              onClick={() => reader.select(plate)}
              aria-pressed={plate === active}
              className={cn(
                'rounded-full border px-3 py-1 font-mono text-xs',
                plate === active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-muted'
              )}
            >
              {plate}
            </button>
          ))}
        </div>
      )}

      {!!active && <ArPlateCard key={active} plate={active} auto={auto} onNavigate={onNavigate} />}
    </div>
  )
}
