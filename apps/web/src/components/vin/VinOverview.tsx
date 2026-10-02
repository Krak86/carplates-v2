import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { VinDecodeResponse } from '@carplates/shared'

import VinAssists from '@/components/vin/VinAssists'
import VinCarSchematic from '@/components/vin/VinCarSchematic'
import VinDetails from '@/components/vin/VinDetails'
import VinEngineCard from '@/components/vin/VinEngineCard'
import VinHeadline from '@/components/vin/VinHeadline'
import VinMotorcycleSchematic from '@/components/vin/VinMotorcycleSchematic'
import VinOriginCard from '@/components/vin/VinOriginCard'
import VinSegments from '@/components/vin/VinSegments'
import VinSection from '@/components/vin/VinSection'
import VinStatusBanner from '@/components/vin/VinStatusBanner'
import {
  buildSchematicModel,
  hasAssists,
  hasCarSchematicData,
  toFieldMap,
  vehicleShape
} from '@/components/vin/helpers'

type Props = {
  data: VinDecodeResponse
}

/** The default VIN view: anatomy, headline, car schematic, engine, origin, assists, then the grouped fields. */
export default function VinOverview({ data }: Props): ReactNode {
  const { t } = useTranslation()
  const fields = toFieldMap(data.results)
  const shape = vehicleShape(fields)
  const showCar = shape === 'car' && hasCarSchematicData(buildSchematicModel(fields))

  return (
    <div>
      <VinStatusBanner fields={fields} />
      <VinSegments vin={data.vin} fields={fields} />
      <VinHeadline vin={data.vin} fields={fields} />

      {showCar && (
        <VinSection icon="🚗" title={t('vin.car.title')}>
          <VinCarSchematic fields={fields} />
        </VinSection>
      )}

      {shape === 'motorcycle' && (
        <VinSection icon="🏍️" title={t('vin.moto.title')}>
          <VinMotorcycleSchematic fields={fields} />
        </VinSection>
      )}

      <VinSection icon="⚙️" title={t('vin.engine.title')}>
        <VinEngineCard fields={fields} />
      </VinSection>

      <VinSection icon="🏭" title={t('vin.origin.title')}>
        <VinOriginCard fields={fields} />
      </VinSection>

      {hasAssists(fields) && (
        <VinSection icon="🛡️" title={t('vin.assists.title')}>
          <VinAssists fields={fields} />
        </VinSection>
      )}

      <VinSection icon="📋" title={t('vin.details.title')}>
        <VinDetails results={data.results} />
      </VinSection>
    </div>
  )
}
