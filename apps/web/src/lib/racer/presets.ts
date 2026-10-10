import { CAR_BODIES, type CarBody } from '@/lib/racer/config'

/** A well-known real car the game dresses the player's sprite as: the make / model / year label and its paint. */
export type CarPreset = {
  label: string
  /** `#rrggbb` */
  color: string
}

/** Hardcoded examples per vehicle category, so the plate-less test drive starts as a recognisable car. */
export const CAR_PRESETS: Readonly<Record<CarBody, readonly CarPreset[]>> = {
  sedan: [
    { label: 'Toyota Camry (2018)', color: '#f2f2f2' },
    { label: 'BMW 3 Series (2019)', color: '#1f3a93' },
    { label: 'Honda Accord (2016)', color: '#9aa0a6' }
  ],
  hatch: [
    { label: 'Volkswagen Golf (2017)', color: '#b3262d' },
    { label: 'Ford Focus (2015)', color: '#2f5fb3' },
    { label: 'Renault Clio (2019)', color: '#e8a317' }
  ],
  suv: [
    { label: 'Toyota RAV4 (2019)', color: '#5f6368' },
    { label: 'Nissan Qashqai (2018)', color: '#7a1c24' },
    { label: 'Jeep Wrangler (2020)', color: '#3f6b3a' }
  ],
  sport: [
    { label: 'Chevrolet Camaro (2017)', color: '#f2c200' },
    { label: 'Ford Mustang (2018)', color: '#1d4e9e' },
    { label: 'Porsche 911 (2019)', color: '#c8ccd0' }
  ],
  pickup: [
    { label: 'Ford F-150 (2018)', color: '#b3262d' },
    { label: 'Toyota Hilux (2017)', color: '#f2f2f2' },
    { label: 'Mitsubishi L200 (2016)', color: '#6b7075' }
  ],
  van: [
    { label: 'Mercedes-Benz Sprinter (2016)', color: '#f2f2f2' },
    { label: 'Ford Transit (2018)', color: '#d9dde1' },
    { label: 'Volkswagen Transporter (2015)', color: '#2f5fb3' }
  ],
  moto: [
    { label: 'Honda CBR600RR (2018)', color: '#c4161c' },
    { label: 'Yamaha MT-07 (2019)', color: '#1d4e9e' },
    { label: 'Kawasaki Ninja 400 (2020)', color: '#3fae4d' }
  ],
  taxi: [
    { label: 'Skoda Octavia (2017)', color: '#f2c200' },
    { label: 'Ford Mondeo (2015)', color: '#f2c200' }
  ],
  police: [
    { label: 'Toyota Prius (2017)', color: '#f2f2f2' },
    { label: 'Ford Focus (2016)', color: '#f2f2f2' }
  ],
  ambulance: [{ label: 'Mercedes-Benz Sprinter (2017)', color: '#f2f2f2' }],
  firetruck: [{ label: 'MAN TGM (2015)', color: '#c4161c' }],
  garbage: [{ label: 'Mercedes-Benz Econic (2016)', color: '#e8710a' }],
  bus: [
    { label: 'Mercedes-Benz Citaro (2014)', color: '#f2f2f2' },
    { label: 'Bogdan A092 (2012)', color: '#f2c200' }
  ]
}

/** The make is the first word of the label ("Mercedes-Benz Sprinter (2016)"). */
export function presetBrand(preset: CarPreset): string {
  return preset.label.split(' ')[0] ?? preset.label
}

/** A random example of the category; the list is never empty, the fallback only satisfies the index type. */
export function randomPreset(body: CarBody): CarPreset {
  const list = CAR_PRESETS[body]
  return list[Math.floor(Math.random() * list.length)] ?? { label: body, color: '#f2f2f2' }
}

/** A random category with a random example — the plate-less route's starting car. */
export function randomCar(): { body: CarBody; preset: CarPreset } {
  const body = CAR_BODIES[Math.floor(Math.random() * CAR_BODIES.length)] ?? 'sedan'
  return { body, preset: randomPreset(body) }
}
