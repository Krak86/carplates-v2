import type { ReactNode } from 'react'

import CO2Badge from '@/components/CO2Badge'

type Sample = {
  name: string
  co2GKmMin: number
  co2GKmMax: number
  l100kmMin: number | null
  l100kmMax: number | null
  evKwh100km?: number
}

// Real fueleconomy.gov 2018 rows (registry.fuel_economy), aggregated to min–max per model.
const SAMPLES: readonly Sample[] = [
  { name: 'Nissan Leaf 2018 (EV)', co2GKmMin: 0, co2GKmMax: 0, l100kmMin: null, l100kmMax: null, evKwh100km: 18.6 },
  { name: 'Toyota Prius 2018 (hybrid)', co2GKmMin: 106, co2GKmMax: 106, l100kmMin: 4.5, l100kmMax: 4.5 },
  { name: 'Toyota Camry 2018', co2GKmMin: 164, co2GKmMax: 210, l100kmMin: 6.9, l100kmMax: 9 },
  { name: 'Volkswagen Golf 2018', co2GKmMin: 192, co2GKmMax: 199, l100kmMin: 8.1, l100kmMax: 8.4 },
  { name: 'Ford Mustang 2018', co2GKmMin: 219, co2GKmMax: 304, l100kmMin: 9.4, l100kmMax: 13.1 },
  { name: 'Ford F-150 2018', co2GKmMin: 249, co2GKmMax: 309, l100kmMin: 9.4, l100kmMax: 13.1 },
  { name: 'Chevrolet Suburban 2018', co2GKmMin: 291, co2GKmMax: 313, l100kmMin: 12.4, l100kmMax: 13.1 }
]

/** Dev-only gallery (route registered only in `import.meta.env.DEV`) for eyeballing CO2Badge across the score range. */
export default function Co2PreviewRoute(): ReactNode {
  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {SAMPLES.map(({ name, ...badge }) => (
        <section key={name}>
          <h2 className="mb-1 text-sm font-semibold">{name}</h2>
          <CO2Badge {...badge} cycle="EPA" />
        </section>
      ))}
    </div>
  )
}
