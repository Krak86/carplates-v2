import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { VehicleKind } from '@carplates/shared'

type Props = {
  kind: VehicleKind
}

/** Greyscale WebP per kind, built by `pnpm build:kind-images` from `apps/web/assets-src/kind/`.
 *  The kinds without their own photo share the `specialized` one. */
const IMAGE_BY_KIND: Readonly<Record<VehicleKind, string>> = {
  passenger: 'passenger',
  truck: 'truck',
  bus: 'bus',
  motorcycle: 'motorcycle',
  moped: 'moped',
  trailer: 'trailer',
  semiTrailer: 'semiTrailer',
  quad: 'quad',
  tricycle: 'tricycle',
  motoTricycle: 'motoTricycle',
  specialized: 'specialized',
  special: 'specialized',
  undetermined: 'specialized'
}

/** Same footprint as the hero photo it stands in for — a grey stock photo of the vehicle's kind, with its label on top. */
export default function VehicleKindPlaceholder({ kind }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-black/10 dark:bg-white/10">
      <img
        src={`/kind/${IMAGE_BY_KIND[kind]}.webp`}
        alt=""
        crossOrigin="anonymous"
        className="h-full w-full scale-105 object-cover blur-[3px]"
      />

      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-2 text-center text-white">
          <p className="rounded-xl bg-black/50 px-5 py-2 text-3xl font-bold backdrop-blur-sm sm:text-4xl">
            {t(`vehicleKind.${kind}`)}
          </p>
          <p className="rounded-xl bg-black/50 px-4 py-1.5 text-lg font-medium backdrop-blur-sm sm:text-xl">
            {t('wiki.noImage')}
          </p>
        </div>
      </div>
    </div>
  )
}
