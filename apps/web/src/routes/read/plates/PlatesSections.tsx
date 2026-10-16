import type { ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { regionName } from '@carplates/shared'

import PlateSegments from '@/components/PlateSegments'
import UaPlateBadge from '@/components/UaPlateBadge'
import Card from '@/components/ui/Card'
import { useRegionLabel } from '@/lib/region-label'
import { VIN_PATH } from '@/routes/read/links'
import { lookupPrefix, regionRows } from '@/routes/read/plates/helpers'

const CURRENT_EXAMPLE = 'КА1234ВС'
const LEGACY_EXAMPLE = '11АА1234'
const SERVICE_EXAMPLES = ['DІ7635ІА', 'ЕD1234AB']

const REGION_ROWS = regionRows()

/** The two standard shapes, each split into region · number · series with the plate card's explainer. */
export function AnatomySection(): ReactNode {
  const { t } = useTranslation()

  return (
    <Card id="anatomy" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.plates.anatomyTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.plates.anatomyIntro')}</p>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <h3 className="font-medium">{t('read.plates.current')}</h3>
          <UaPlateBadge plate={CURRENT_EXAMPLE} className="self-start" />
          <PlateSegments plate={CURRENT_EXAMPLE} region={regionName(CURRENT_EXAMPLE) ?? null} />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-medium">{t('read.plates.legacy')}</h3>
          <UaPlateBadge plate={LEGACY_EXAMPLE} className="self-start" />
          <PlateSegments plate={LEGACY_EXAMPLE} region={regionName(LEGACY_EXAMPLE) ?? null} />
        </div>
      </div>
    </Card>
  )
}

/** "Type a plate" lookup plus the full region table, built from the shared tables. */
export function RegionsSection(): ReactNode {
  const { t } = useTranslation()
  const regionLabel = useRegionLabel()
  const [query, setQuery] = useState('')
  const found = lookupPrefix(query)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => setQuery(event.target.value)

  return (
    <Card id="regions" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.plates.regionsTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.plates.regionsIntro')}</p>

      <label className="mb-1 block text-sm font-medium" htmlFor="plate-prefix">
        {t('read.plates.lookup')}
      </label>
      <input
        id="plate-prefix"
        value={query}
        onChange={handleChange}
        maxLength={8}
        autoComplete="off"
        placeholder="КА1234ВС"
        className="mb-2 w-full max-w-xs rounded-lg border border-border bg-(--color-bg) px-3 py-1.5 font-mono uppercase"
      />

      <p className="mb-4 min-h-6" aria-live="polite">
        {found?.kind === 'region' && (
          <span className="font-medium">
            {found.prefix} → {regionLabel(found.region)}
            {found.legacy && <span className="text-muted"> · {t('read.plates.legacyCode')}</span>}
          </span>
        )}
        {found?.kind === 'service' && (
          <span className="font-medium">
            {found.prefix} → {t(`plate.seg.service.${found.series}`)} · {t('read.plates.noRegion')}
          </span>
        )}
        {found?.kind === 'unknown' && <span className="text-muted">{t('read.plates.unknownPrefix')}</span>}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-1 pr-3 font-medium">{t('read.plates.colRegion')}</th>
              <th className="py-1 pr-3 font-medium">{t('read.plates.colPairs')}</th>
              <th className="py-1 font-medium">{t('read.plates.colLegacy')}</th>
            </tr>
          </thead>

          <tbody>
            {REGION_ROWS.map(row => (
              <tr key={row.region} className="border-b border-border/50 align-top">
                <td className="py-1.5 pr-3">
                  <Link to={`/advanced-search?${new URLSearchParams({ region: row.region })}`} className="text-primary">
                    {regionLabel(row.region)}
                  </Link>
                </td>
                <td className="py-1.5 pr-3 font-mono">{row.pairs.join(' ')}</td>
                <td className="py-1.5 font-mono">{row.legacy.join(' ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-muted">{t('read.plates.regionsNote')}</p>
    </Card>
  )
}

/** Plates that do not name a region: the online-service series and registrations without a plate. */
export function FormatsSection(): ReactNode {
  const { t } = useTranslation()

  return (
    <Card id="formats" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.plates.formatsTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.plates.formatsIntro')}</p>

      <div className="mb-3 flex flex-wrap gap-3">
        {SERVICE_EXAMPLES.map(plate => (
          <UaPlateBadge key={plate} plate={plate} />
        ))}
      </div>

      <ul className="list-disc space-y-1 pl-5">
        <li>{t('read.plates.formatDiia')}</li>
        <li>{t('read.plates.formatCabinet')}</li>
        <li>{t('read.plates.formatChoice')}</li>
        <li>
          {t('read.plates.formatNoPlate')}{' '}
          <Link to={VIN_PATH} className="text-primary">
            {t('nav.readVin')} →
          </Link>
        </li>
      </ul>
    </Card>
  )
}
