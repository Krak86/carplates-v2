/**
 * Hand-maintained inputs of `ingest:brand-origin`. Both maps are keyed by our brand slug (`brandSlug()`).
 *
 * - `WIKIDATA_ALIASES`: Wikidata ids that always count as the brand when its label does not slugify to ours (e.g. "AutoZAZ").
 *   Find the id on wikidata.org, add it with a comment saying what it is.
 * - `ORIGIN_OVERRIDES`: periods that REPLACE whatever Wikidata gave for the slug. Use for legacy-country gaps (Wikidata only has the
 *   modern state) and for brands Wikidata lacks. `countryCode` is a modern ISO code, or a legacy code (`SU` ...) that is then shown as
 *   is; `countryAtYear` maps modern codes to the legacy state of the year, so only a state that must read differently (Ukrainian SSR
 *   cars show the USSR flag but we want the period boundary explicit) needs a legacy code here.
 * - `OWNERSHIP_OVERRIDES`: ownership rows REPLACING Wikidata's for the slug (only where Wikidata is known wrong or empty).
 * - `HQ_CITY_OVERRIDES`: just the HQ city of the Wikidata origin row.
 *
 * Every entry has a `source` (a URL), shown to the user as the fact's source.
 */
import type { BrandOriginRow, BrandOwnershipRowOut } from './brand-origin-parse.js'

export const WIKIDATA_ALIASES: Readonly<Record<string, readonly string[]>> = {
  daewoo: ['Q27483'], // Daewoo Motors
  peugeot: ['Q6742'], // Peugeot (brand of Stellantis)
  daf: ['Q27489'], // DAF
  schmitz: ['Q320000'], // Schmitz Cargobull
  kamaz: ['Q30378'], // Kamaz
  tesla: ['Q478214'], // Tesla, Inc.
  iveco: ['Q29913'], // Iveco
  kraz: ['Q783036'], // Kremenchuk Automobile Plant
  bajaj: ['Q10910065'], // Bajaj Auto
  benalu: ['Q48747266'], // Benalu (trailers)
  haval: ['Q28223947'], // Haval (brand of Great Wall Motor)
  hyosung: ['Q497254'], // Hyosung
  neoplan: ['Q326013'], // Neoplan
  laz: ['Q2621897'], // Lviv Bus Factory
  paz: ['Q2507663'], // Pavlovo Bus Factory
  sym: ['Q534944'], // SYM motorcycles
  kmz: ['Q4220216'] // Kyiv Motorcycle Plant
}

type OriginOverride = Omit<BrandOriginRow, 'brandSlug'>

export const ORIGIN_OVERRIDES: Readonly<Record<string, readonly OriginOverride[]>> = {
  // Zaporizhzhia: a Soviet plant until 1991, Ukrainian after.
  zaz: [
    {
      fromYear: 0,
      toYear: 1991,
      countryCode: 'SU',
      foundedYear: 1863,
      hqCity: 'Zaporizhzhia',
      source: 'https://uk.wikipedia.org/wiki/Запорізький_автомобілебудівний_завод'
    },
    {
      fromYear: 1992,
      toYear: null,
      countryCode: 'UA',
      foundedYear: 1863,
      hqCity: 'Zaporizhzhia',
      source: 'https://uk.wikipedia.org/wiki/Запорізький_автомобілебудівний_завод'
    }
  ],
  // Lutsk
  luaz: [
    {
      fromYear: 0,
      toYear: 1991,
      countryCode: 'SU',
      foundedYear: 1955,
      hqCity: 'Lutsk',
      source: 'https://uk.wikipedia.org/wiki/Луцький_автомобільний_завод'
    },
    {
      fromYear: 1992,
      toYear: null,
      countryCode: 'UA',
      foundedYear: 1955,
      hqCity: 'Lutsk',
      source: 'https://uk.wikipedia.org/wiki/Луцький_автомобільний_завод'
    }
  ],
  // Moscow
  azlk: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'RU',
      foundedYear: 1930,
      hqCity: 'Moscow',
      source: 'https://en.wikipedia.org/wiki/Moskvich'
    }
  ],
  // Miass
  ural: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'RU',
      foundedYear: 1941,
      hqCity: 'Miass',
      source: 'https://en.wikipedia.org/wiki/Ural_Automotive_Plant'
    }
  ],
  // Neftekamsk
  nefaz: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'RU',
      foundedYear: null,
      hqCity: 'Neftekamsk',
      source: 'https://en.wikipedia.org/wiki/NefAZ'
    }
  ],
  // Lutsk
  bogdan: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'UA',
      foundedYear: null,
      hqCity: 'Lutsk',
      source: 'https://en.wikipedia.org/wiki/Bogdan_Motors'
    }
  ],
  // Odesa
  odaz: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'UA',
      foundedYear: null,
      hqCity: 'Odesa',
      source: 'https://en.wikipedia.org/wiki/Odesa_Automobile_Assembly_Plant'
    }
  ],
  // Daewoo Motors (defunct 2002, Wikidata has no country)
  daewoo: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'KR',
      foundedYear: null,
      hqCity: null,
      source: 'https://en.wikipedia.org/wiki/Daewoo_Motors'
    }
  ],
  // DAF Trucks
  daf: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'NL',
      foundedYear: 1928,
      hqCity: 'Eindhoven',
      source: 'https://en.wikipedia.org/wiki/DAF_Trucks'
    }
  ],
  // Krone trailers
  krone: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'DE',
      foundedYear: 1906,
      hqCity: 'Spelle',
      source: 'https://en.wikipedia.org/wiki/Krone_(company)'
    }
  ],
  // Kögel trailers
  kogel: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'DE',
      foundedYear: 1934,
      hqCity: 'Burtenbach',
      source: 'https://en.wikipedia.org/wiki/Kögel_Trailer'
    }
  ],
  // Schwarzmüller trailers
  schwarzmuller: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'AT',
      foundedYear: null,
      hqCity: 'Freinberg',
      source: 'https://en.wikipedia.org/wiki/Schwarzmüller'
    }
  ],
  // Wielton trailers
  wielton: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'PL',
      foundedYear: null,
      hqCity: 'Wieluń',
      source: 'https://en.wikipedia.org/wiki/Wielton'
    }
  ],
  // Haval, a Great Wall Motor brand
  haval: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'CN',
      foundedYear: null,
      hqCity: 'Baoding',
      source: 'https://en.wikipedia.org/wiki/Haval_(marque)'
    }
  ],
  // Loncin motorcycles
  loncin: [
    {
      fromYear: 0,
      toYear: null,
      countryCode: 'CN',
      foundedYear: null,
      hqCity: 'Chongqing',
      source: 'https://en.wikipedia.org/wiki/Loncin_Motor'
    }
  ]
}

/**
 * `HQ_CITY_OVERRIDES`: replaces only the `hqCity` of the Wikidata origin row (Wikidata gives a country, a building or a ward).
 * `null` = unknown, shown as nothing. The city's source is the Wikipedia article in the comment.
 */
export const HQ_CITY_OVERRIDES: Readonly<Record<string, string | null>> = {
  lada: 'Tolyatti', // https://en.wikipedia.org/wiki/Lada
  citroen: 'Paris', // https://en.wikipedia.org/wiki/Citro%C3%ABn (Wikidata: "PSA Poissy Plant")
  mini: null, // https://en.wikipedia.org/wiki/Mini_(marque) lists no HQ (Wikidata: "Germany")
  chrysler: 'Auburn Hills', // https://en.wikipedia.org/wiki/Chrysler
  dodge: 'Auburn Hills', // https://en.wikipedia.org/wiki/Dodge
  mazda: 'Fuchū', // https://en.wikipedia.org/wiki/Mazda
  honda: 'Tokyo', // https://en.wikipedia.org/wiki/Honda (Minato, Tokyo)
  scania: 'Södertälje' // https://en.wikipedia.org/wiki/Scania_AB
}

type OwnershipOverride = Omit<BrandOwnershipRowOut, 'brandSlug'>

const own = (ownerName: string, fromYear: number, toYear: number | null, source: string): OwnershipOverride => ({
  ownerName,
  ownerCountry: null,
  fromYear,
  toYear,
  source
})

const SKODA = 'https://en.wikipedia.org/wiki/%C5%A0koda_Auto'
const VOLVO = 'https://en.wikipedia.org/wiki/Volvo_Cars'
const NISSAN = 'https://en.wikipedia.org/wiki/Nissan'
const LADA = 'https://en.wikipedia.org/wiki/Lada'
const OPEL = 'https://en.wikipedia.org/wiki/Opel'
const FIAT = 'https://en.wikipedia.org/wiki/Fiat_Automobiles'
const LAND_ROVER = 'https://en.wikipedia.org/wiki/Land_Rover'
const CITROEN = 'https://en.wikipedia.org/wiki/Citro%C3%ABn'

export const OWNERSHIP_OVERRIDES: Readonly<Record<string, readonly OwnershipOverride[]>> = {
  skoda: [own('Volkswagen Group', 1991, null, SKODA)],
  // Renault took 36.8 % in 1999 and holds 15 % voting rights since 2023; the Alliance is not an owner.
  nissan: [own('Renault', 1999, null, NISSAN)],
  lada: [own('Renault', 2016, 2022, LADA), own('NAMI', 2022, null, LADA)],
  volvo: [own('Ford', 1999, 2010, VOLVO), own('Geely', 2010, null, VOLVO)],
  opel: [
    own('General Motors', 1929, 2017, OPEL),
    own('PSA Group', 2017, 2021, OPEL),
    own('Stellantis', 2021, null, OPEL)
  ],
  fiat: [
    own('Fiat Group', 1899, 2014, FIAT),
    own('Fiat Chrysler Automobiles', 2014, 2021, FIAT),
    own('Stellantis', 2021, null, FIAT)
  ],
  'land-rover': [
    own('British Leyland', 1978, 1986, LAND_ROVER),
    own('Rover Group', 1986, 1994, LAND_ROVER),
    own('BMW', 1994, 2000, LAND_ROVER),
    own('Ford', 2000, 2008, LAND_ROVER),
    own('Tata Motors', 2008, 2012, LAND_ROVER),
    own('Jaguar Land Rover', 2013, null, LAND_ROVER)
  ],
  // Wikidata gave Stellantis from "always"; PSA bought Citroën in 1976 (Peugeot SA, later PSA) and Stellantis owns it since 2021.
  citroen: [own('PSA Group', 1976, 2021, CITROEN), own('Stellantis', 2021, null, CITROEN)],
  peugeot: [own('PSA Group', 1976, 2021, CITROEN), own('Stellantis', 2021, null, CITROEN)],
  // Honda is listed on the Tokyo / New York exchanges with no parent; Wikidata's only row is the shareholder Tokio Marine
  // (https://en.wikipedia.org/wiki/Honda).
  honda: []
}
