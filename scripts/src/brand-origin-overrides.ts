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

export const OWNERSHIP_OVERRIDES: Readonly<Record<string, readonly Omit<BrandOwnershipRowOut, 'brandSlug'>[]>> = {}
