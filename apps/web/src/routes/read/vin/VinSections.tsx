import type { ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import SegmentExplainer from '@/components/SegmentExplainer'
import type { SegmentColor } from '@/components/SegmentExplainer'
import Card from '@/components/ui/Card'
import { countryName, isoFlag, VIN_SEGMENT_POSITIONS } from '@/components/vin/helpers'
import type { VinSegmentId } from '@/components/vin/types'
import { cleanVin, EXAMPLE_VIN, readVin, yearCodeRows } from '@/routes/read/vin/helpers'

const SEGMENT_COLOR: Readonly<Record<VinSegmentId, SegmentColor>> = {
  wmi: 'sky',
  vds: 'violet',
  check: 'emerald',
  year: 'amber',
  plant: 'rose',
  serial: 'slate'
}

const YEAR_ROWS = yearCodeRows()
const VIN_LENGTH = 17

/** "Type a VIN": the six parts of a VIN as colour-coded chips, filled in from the shared WMI table (no lookup). */
export function AnatomySection(): ReactNode {
  const { t, i18n } = useTranslation()
  const [input, setInput] = useState(EXAMPLE_VIN)
  const reading = readVin(input)
  const typed = cleanVin(input)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => setInput(event.target.value)

  const params = {
    manufacturer: reading?.make ?? '—',
    country: reading?.country ? `${isoFlag(reading.country)} ${countryName(reading.country, i18n.language)}` : '—',
    year: reading?.year ? String(reading.year) : '—'
  }
  const checkNote = reading ? t(reading.checkOk ? 'read.vin.checkOk' : 'read.vin.checkFail') : ''
  const describe = (id: VinSegmentId): string => {
    if (id === 'vds') return t('read.vin.vdsDesc')
    if (id === 'plant') return t('read.vin.plantDesc')
    if (id === 'check') return `${t('vin.seg.check.desc')} ${checkNote}`
    return t(`vin.seg.${id}.desc`, params)
  }

  return (
    <Card id="anatomy" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.vin.anatomyTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.vin.anatomyIntro')}</p>

      <label className="mb-1 block text-sm font-medium" htmlFor="vin-input">
        {t('read.vin.inputLabel')}
      </label>
      <input
        id="vin-input"
        value={input}
        onChange={handleChange}
        maxLength={VIN_LENGTH + 4}
        autoComplete="off"
        spellCheck={false}
        placeholder={EXAMPLE_VIN}
        className="mb-2 w-full max-w-sm rounded-lg border border-border bg-(--color-bg) px-3 py-1.5 font-mono uppercase"
      />

      <p className="mb-3 min-h-6 text-sm" aria-live="polite">
        {!reading && typed.length > 0 && (
          <span className="text-muted">{t('read.vin.incomplete', { n: typed.length, max: VIN_LENGTH })}</span>
        )}
        {!!reading && !reading.make && <span className="text-muted">{t('read.vin.unknownMaker')}</span>}
      </p>

      {!!reading && (
        <SegmentExplainer
          key={reading.vin}
          hint={t('vin.seg.hint')}
          label={t('vin.seg.label')}
          segments={reading.segments.map(s => ({
            id: s.id,
            text: s.text,
            color: SEGMENT_COLOR[s.id],
            title: t(`vin.seg.${s.id}.title`),
            positions: t('vin.seg.positions', { range: VIN_SEGMENT_POSITIONS[s.id] }),
            desc: describe(s.id)
          }))}
        />
      )}

      <p className="mt-3 text-sm text-muted">{t('read.vin.anatomyNote')}</p>
    </Card>
  )
}

/** The position-10 model-year code table. */
export function YearsSection(): ReactNode {
  const { t } = useTranslation()

  return (
    <Card id="years" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.vin.yearsTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.vin.yearsIntro')}</p>

      <ul className="mb-3 grid grid-cols-3 gap-x-4 gap-y-1 font-mono text-sm sm:grid-cols-5">
        {YEAR_ROWS.map(row => (
          <li key={row.code}>
            <span className="inline-block w-5 font-semibold">{row.code}</span> {row.year}
          </li>
        ))}
      </ul>

      <ul className="list-disc space-y-1 pl-5">
        <li>{t('read.vin.yearsNever')}</li>
        <li>{t('read.vin.yearsCycle')}</li>
        <li>{t('read.vin.yearsModelYear')}</li>
      </ul>
    </Card>
  )
}

/** Where to find the VIN, and what to know about VINs in the Ukrainian registry. */
export function WhereSection(): ReactNode {
  const { t } = useTranslation()

  return (
    <Card id="where" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.vin.whereTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.vin.whereIntro')}</p>

      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>{t('read.vin.whereWindscreen')}</li>
        <li>{t('read.vin.wherePillar')}</li>
        <li>{t('read.vin.whereEngine')}</li>
        <li>{t('read.vin.whereDocs')}</li>
      </ul>

      <h3 className="mb-1 font-medium">{t('read.vin.registryTitle')}</h3>
      <ul className="mb-3 list-disc space-y-1 pl-5">
        <li>{t('read.vin.registrySince')}</li>
        <li>{t('read.vin.registryBody')}</li>
        <li>{t('read.vin.registryLimits')}</li>
      </ul>

      <p className="text-sm">
        <Link to="/" className="text-primary">
          {t('read.vin.searchLink')}
        </Link>
      </p>
    </Card>
  )
}
