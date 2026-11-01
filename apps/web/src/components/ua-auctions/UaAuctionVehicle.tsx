import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { AuctionVehicle } from '@carplates/shared'

import { FUEL_TYPES, TRANSMISSIONS, knownValue } from '@/components/ua-auctions/helpers'
import { toIntlLocale } from '@/lib/intl'

type Props = {
  vehicle: AuctionVehicle
}

function Row({ label, value }: { label: string; value: ReactNode }): ReactNode {
  if (value === null || value === undefined || value === '' || value === false) return null
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-[var(--color-muted)]">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  )
}

/**
 * The car as one block, merged from all its lots (Prozorro structured values before SETAM titles). Where the sources
 * disagree on make, model or year the shown value is the first and every source's own value is listed under it.
 */
export default function UaAuctionVehicle({ vehicle }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.language)
  const fuel = knownValue(FUEL_TYPES, vehicle.fuel)
  const gearbox = knownValue(TRANSMISSIONS, vehicle.transmission)
  const name = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')

  return (
    <section className="mb-2 rounded-lg border border-[var(--color-border)] p-3 text-sm">
      <h3 className="mb-1 font-semibold">🚗 {t('uaAuctions.specs.title')}</h3>
      <dl className="space-y-0.5">
        <Row label={t('uaAuctions.vehicle')} value={name || null} />
        <Row label={t('field.color')} value={vehicle.color} />
        <Row
          label={t('uaAuctions.specs.kilometrage')}
          value={
            vehicle.kilometrage !== null && `${vehicle.kilometrage.toLocaleString(locale)} ${t('uaAuctions.specs.km')}`
          }
        />
        <Row label={t('field.fuel')} value={fuel ? t(`uaAuctions.fuel.${fuel}`) : vehicle.fuel} />
        <Row
          label={t('uaAuctions.specs.engine')}
          value={vehicle.engineCc !== null && `${vehicle.engineCc.toLocaleString(locale)} ${t('uaAuctions.specs.cc')}`}
        />
        <Row
          label={t('uaAuctions.specs.transmission')}
          value={gearbox ? t(`uaAuctions.transmission.${gearbox}`) : vehicle.transmission}
        />
        <Row label={t('uaAuctions.specs.condition')} value={vehicle.condition} />
        <Row label={t('wanted.plate')} value={vehicle.plate} />
        <Row label={t('wanted.vin')} value={vehicle.vin} />
      </dl>

      {(vehicle.damaged || vehicle.damageText) && (
        <p className="mt-1.5 rounded-md bg-amber-500/10 px-2 py-1">
          ⚠️ {t('uaAuctions.damage')}
          {vehicle.damageText ? `: ${vehicle.damageText}` : ''}
        </p>
      )}

      {vehicle.conflicts.length > 0 && (
        <div className="mt-1.5 text-xs text-[var(--color-muted)]">
          <p>{t('uaAuctions.specs.conflicts')}</p>
          <ul className="list-disc pl-5">
            {vehicle.conflicts.map(c => (
              <li key={c.field}>
                {t(`uaAuctions.specs.field.${c.field}`)}:{' '}
                {c.values.map(v => `${t(`uaAuctions.source.${v.source}`)} - ${v.value}`).join('; ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
