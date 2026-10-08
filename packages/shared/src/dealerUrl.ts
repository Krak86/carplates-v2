import { brandSlug } from './brandLogo.js'

/**
 * Outbound link only — current model info/pricing lives on these sites, not in this app.
 * No scraping (see PLAN.md's "New-car MSRP + specs from official distributor sites" entry:
 * ~15-20 independently-run UA distributor sites, mostly PDF price lists, no APIs, ToS risk).
 *
 * Keyed by the same slug `brandLogo.ts` derives, sourced from a one-time web research pass
 * (2026-09-25) rather than guessed — each UA entry is that brand's actual official
 * importer/distributor site (e.g. Toyota → UkrAVTO's toyota.ua, Ford/Volvo/Land
 * Rover/Jaguar/MG → Winner Group). Where UA distributor sites share one multi-brand site
 * (Dacia sold under the Renault brand in Ukraine; Haval/Great Wall/Ora under one GWM
 * Ukraine site), both slugs point at the same URL. Where no UA-specific site
 * was found with confidence — brand absent from the Ukrainian market, or no single
 * canonical distributor (MAN's several independent regional dealers) — falls back to the
 * manufacturer's own global site per the user's request, never a random dealer's page.
 * Brands with no confident answer either way (mostly rare Chinese/heavy-truck marques, and
 * sanctioned Russian brands — ВАЗ/lada, ГАЗ/gaz, КАМАЗ/kamaz, УАЗ/uaz) are left out: no
 * link renders, same as `brandLogoUrl` returning null for an unmatched brand.
 */
const DEALER_URL_BY_SLUG: Readonly<Record<string, string>> = {
  volkswagen: 'https://www.volkswagen.ua/',
  renault: 'https://www.renault.ua/',
  'mercedes-benz': 'https://www.mercedes-benz.ua/',
  skoda: 'https://www.skoda-auto.ua/',
  ford: 'https://ford.ua/',
  toyota: 'https://www.toyota.ua/',
  opel: 'https://www.opel.ua/',
  hyundai: 'https://hyundai.com.ua/',
  bmw: 'https://www.bmw.ua/',
  nissan: 'https://www.nissan.ua/',
  audi: 'https://www.audi.ua/',
  kia: 'https://www.kia.com/ua/',
  mazda: 'https://mazda.ua/',
  mitsubishi: 'https://mitsubishi-motors.com.ua/',
  peugeot: 'https://www.peugeot.ua/',
  honda: 'https://honda.ua/',
  // zaz: 'https://www.zaz.ua/',
  citroen: 'https://www.citroen.ua/',
  volvo: 'https://www.volvocars.com/uk-ua/',
  dacia: 'https://www.renault.ua/',
  lexus: 'https://www.lexus.ua/',
  jeep: 'https://jeep.ua/',
  daf: 'https://daf.ua/',
  suzuki: 'https://suzuki.ua/',
  subaru: 'https://subaru.ua/',
  chery: 'https://chery.ua/',
  'land-rover': 'https://landrover.com.ua/',
  geely: 'https://geely.com.ua/',
  seat: 'https://www.seat.ua/',
  cupra: 'https://www.cupraofficial.com.ua/',
  infiniti: 'https://www.infiniti.ua/',
  porsche: 'https://dealer.porsche.com/ua/kyivairport',
  jaguar: 'https://jaguar.com.ua/',
  bentley: 'https://bentley-kyiv.com/',
  mg: 'https://mgmotor.com.ua/',
  jetour: 'https://jetour.com.ua/',
  haval: 'https://www.haval-ukraine.com/',
  'great-wall': 'https://www.haval-ukraine.com/',
  greatwall: 'https://www.haval-ukraine.com/',

  // No confident UA-specific site — manufacturer's own global site instead.
  tesla: 'https://www.tesla.com/',
  chevrolet: 'https://www.chevrolet.com/',
  fiat: 'https://www.fiat.com/',
  dodge: 'https://www.dodge.com/',
  chrysler: 'https://www.chrysler.com/',
  ram: 'https://www.ramtrucks.com/',
  lincoln: 'https://www.lincoln.com/',
  cadillac: 'https://www.cadillac.com/',
  buick: 'https://www.buick.com/',
  man: 'https://www.man.eu/',
  byd: 'https://www.byd.com/en',
  mini: 'https://www.mini.com/',
  'rolls-royce': 'https://www.rolls-roycemotorcars.com/',
  'aston-martin': 'https://www.astonmartin.com/',
  ferrari: 'https://www.ferrari.com/',
  lamborghini: 'https://www.lamborghini.com/',
  maserati: 'https://www.maserati.com/',
  mclaren: 'https://cars.mclaren.com/',
  'alfa-romeo': 'https://www.alfaromeo.com/',
  ds: 'https://www.dsautomobiles.com/',
  lancia: 'https://www.lancia.com/',
  abarth: 'https://www.abarth.com/',
  bugatti: 'https://www.bugatti.com/',
  isuzu: 'https://www.isuzu.com/',
  iveco: 'https://www.iveco.com/',
  scania: 'https://www.scania.com/',
  kenworth: 'https://www.kenworth.com/',
  peterbilt: 'https://www.peterbilt.com/',
  'western-star': 'https://www.westernstar.com/',
  daihatsu: 'https://www.daihatsu.com/',
  smart: 'https://www.smart.com/',
  acura: 'https://www.acura.com/',
  xpeng: 'https://www.xpeng.com/',
  nio: 'https://www.nio.com/',
  rivian: 'https://rivian.com/',
  polestar: 'https://www.polestar.com/'
}

/**
 * Deep link to the importer's own "new cars / model range" list page — again outbound only, nothing is
 * fetched or copied (the sites' terms forbid republishing their content; a plain link is fine). Each URL
 * was checked to return 200 on 2026-10-07. Brands with an empty string have no verified list page yet
 * (404, bot-blocked, or only per-model pages) and get no new-cars link.
 */
const NEW_CARS_URL_BY_SLUG: Readonly<Record<string, string>> = {
  toyota: 'https://www.toyota.ua/new-cars',
  lexus: 'https://www.lexus.ua/new-cars',
  skoda: 'https://www.skoda-auto.ua/models/range',
  volkswagen: 'https://www.volkswagen.ua/models',
  hyundai: 'https://hyundai.com.ua/all-models',
  'mercedes-benz': 'https://www.mercedes-benz.ua/models/',
  audi: 'https://www.audi.ua/models/all-models',
  nissan: 'https://www.nissan.ua/vehicles/offers.html',
  mazda: 'https://mazda.ua/cars/',
  mitsubishi: 'https://mitsubishi-motors.com.ua/models',
  honda: 'https://honda.ua/cars/',
  suzuki: 'https://suzuki.ua/cars/',
  chery: 'https://chery.ua/buy-a-car.html',
  renault: 'https://stock.renault.ua/',
  ford: 'https://stock.winner.ua/',
  opel: 'https://store.opel.ua/',
  bmw: 'https://www.bmw.ua/uk/stocklocator.html#/',
  kia: 'https://buy-a-car.kia.ua/',
  peugeot: 'https://cars.peugeot.ua/',
  citroen: 'https://cars.citroen.ua/',
  dacia: 'https://stock.renault.ua/',
  volvo: 'https://www.volvocars.com/uk-ua/inventory/',
  jeep: 'https://www.store.jeep.ua/',
  daf: 'https://daf.ua/trucks/',
  subaru: 'https://subaru.ua/avto-v-nayavnosti',
  'land-rover': 'https://landrover.com.ua/novi-avtomobili',
  geely: 'https://geely.com.ua/',
  seat: 'https://sklad.seat.ua/search?stock-cars=true',
  cupra: 'https://sklad.cupraofficial.com.ua/',
  infiniti: 'https://www.infiniti.ua/vehicles/new-vehicles.html',
  porsche: 'https://finder.porsche.com/ua/uk-UA/dealer/search?condition=new&dealership=2476',
  jaguar: 'https://jaguar.com.ua/novi-avtomobili',
  bentley: 'https://bentley-kyiv.com/available-auto/',
  mg: 'https://mgmotor.com.ua/',
  jetour: 'https://jetour.com.ua/avto-v-nayavnosti.html',
  haval: 'https://www.haval-ukraine.com/w/',
  'great-wall': 'https://www.haval-ukraine.com/w/',
  greatwall: 'https://www.haval-ukraine.com/w/'
}

/**
 * Where "new cars of this make" should link: the importer's new-cars / model-list page, or `null` when none is
 * known — the UI then shows no new-cars button, widget or stock row (a bare brand homepage is not a new-cars link).
 */
export function newCarsUrl(brand: string | null | undefined): { url: string } | null {
  const slug = brandSlug(brand)
  const list = slug ? NEW_CARS_URL_BY_SLUG[slug] : undefined
  return list ? { url: list } : null
}

/**
 * The importer's own used / pre-owned (trade-in, certified) cars page — outbound link only, like the new-cars table.
 * Brands without a verified page are `''` (or missing) and get no used-cars row.
 */
const USED_CARS_URL_BY_SLUG: Readonly<Record<string, string>> = {
  lexus: 'https://usedcars.lexus.ua/',
  bmw: 'https://usedcars.bmw.ua/uk',
  'land-rover': 'https://landrover.com.ua/avtomobili-z-probigom',
  porsche: 'https://finder.porsche.com/ua/uk-UA/dealer/search?dealership=2476&condition=used',
  bentley: 'https://bentley-kyiv.com/tradein/',
  haval: 'https://www.haval-ukraine.com/w/sp/favoritess/',

  // Not filled in yet — an empty string means no used-cars row. Add the importer's used-cars page by hand.
  toyota: '',
  skoda: '',
  volkswagen: '',
  hyundai: '',
  'mercedes-benz': '',
  audi: '',
  nissan: '',
  mazda: '',
  mitsubishi: '',
  honda: '',
  suzuki: '',
  chery: '',
  renault: '',
  ford: '',
  opel: '',
  kia: '',
  peugeot: '',
  citroen: '',
  dacia: '',
  volvo: '',
  jeep: '',
  daf: '',
  subaru: '',
  geely: '',
  seat: '',
  cupra: '',
  infiniti: '',
  jaguar: '',
  mg: '',
  jetour: '',
  'great-wall': '',
  greatwall: ''
}

/** The importer's used-cars page for a raw registry `brand` value, or `null` when none is known. */
export function usedCarsUrl(brand: string | null | undefined): string | null {
  const slug = brandSlug(brand)
  return (slug ? USED_CARS_URL_BY_SLUG[slug] : undefined) || null
}

/** Official brand website for a raw registry `brand` value, or `null` when none is known. */
export function dealerUrl(brand: string | null | undefined): string | null {
  const slug = brandSlug(brand)
  return slug ? (DEALER_URL_BY_SLUG[slug] ?? null) : null
}
