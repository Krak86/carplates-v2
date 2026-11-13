import type { Dataset } from '@/routes/data-status/types'

/**
 * Every data source the site holds, with how it is kept current. docs/SCHEDULE.md is the operational twin (commands, timeouts).
 * A scheduled one names its `job` and the page reads its last run from the server; a manual one carries `refreshedOn`, the date of its
 * last seed-CSV export (`pnpm export:*:csv`): **bump it in the same commit that re-exports the seed**.
 */
export const DATASETS: readonly Dataset[] = [
  // Polled by the API process itself (no cron job, nothing in job_runs)
  {
    id: 'alarms',
    name: 'Ukraine Alarm: air-raid alerts',
    to: '/alarms',
    cadence: 'minutely'
  },

  // Scheduled (infra/vps/ingest.cron)
  // `refreshedOn` of a job = the day its schedule went live (docs/SCHEDULE.md): what is known before the first recorded run.
  {
    id: 'plates',
    name: 'data.gov.ua: vehicle registrations',
    to: '/stats',
    cadence: 'monthly',
    job: 'plates',
    checkEveryDays: 7,
    latestByMonth: true,
    refreshedOn: '2026-10-28'
  },
  {
    id: 'wanted',
    name: 'National Police: wanted vehicles',
    to: '/wanted',
    cadence: 'daily',
    job: 'wanted',
    refreshedOn: '2026-10-28'
  },
  {
    id: 'wantedPlates',
    name: 'National Police: wanted plates (Garpun)',
    to: '/wanted',
    cadence: 'daily',
    job: 'wanted-plates',
    refreshedOn: '2026-10-31'
  },
  {
    id: 'auctions',
    name: 'SETAM: auction lots',
    to: '/auctions',
    cadence: 'daily',
    job: 'auctions',
    refreshedOn: '2026-10-31'
  },
  {
    id: 'prozorroAuctions',
    name: 'Prozorro.Sale: vehicle auctions',
    to: '/auctions',
    cadence: 'daily',
    job: 'prozorro-auctions',
    refreshedOn: '2026-11-02'
  },
  {
    id: 'auctionProceedings',
    name: 'Ministry of Justice: Unified Register of Debtors (reason for SETAM lots)',
    to: '/auctions',
    cadence: 'weekly',
    job: 'auction-proceedings',
    refreshedOn: '2026-11-04'
  },
  {
    id: 'losses',
    name: 'General Staff of the Armed Forces: Russian losses (russianwarship.rip)',
    to: '/alarms',
    cadence: 'daily',
    job: 'losses',
    noteKey: 'dataStatus.note.losses',
    refreshedOn: '2026-11-05'
  },
  {
    id: 'dream',
    name: 'DREAM: recovery projects (dream.gov.ua public API)',
    to: '/alarms?view=recovery',
    cadence: 'daily',
    job: 'dream',
    refreshedOn: '2026-11-06'
  },
  {
    id: 'brandPronounce',
    name: 'Brand pronunciation (Wikipedia, Wikimedia Commons)',
    to: '/cars',
    cadence: 'monthly',
    job: 'brand-pronounce',
    gapKey: 'dataStatus.gap.brandPronounce',
    refreshedOn: '2026-11-07'
  },
  { id: 'news', name: 'News (RSS)', to: '/news', cadence: 'daily', job: 'news', refreshedOn: '2026-10-28' },
  {
    id: 'social',
    name: 'Brand YouTube channels',
    to: '/news',
    cadence: 'daily',
    job: 'social',
    refreshedOn: '2026-10-28'
  },
  {
    id: 'dtpPatrol',
    name: 'Patrol Police: road crashes',
    to: '/road-safety',
    cadence: 'monthly',
    job: 'dtp-patrol',
    latestByMonth: true,
    refreshedOn: '2026-10-31'
  },
  {
    id: 'dtpHazards',
    name: 'data.gov.ua: hazardous road sections',
    to: '/road-safety',
    cadence: 'yearly',
    job: 'dtp-hazards',
    refreshedOn: '2026-10-31'
  },

  { id: 'rdwRecalls', name: 'RDW: recalls (NL)', cadence: 'monthly', job: 'rdw-recalls', refreshedOn: '2026-10-09' },
  {
    id: 'caRecalls',
    name: 'Transport Canada: recalls',
    cadence: 'quarterly',
    job: 'ca-recalls',
    refreshedOn: '2026-10-10'
  },

  // Refreshed by hand, then exported to a seed CSV
  { id: 'euroncap', name: 'Euro NCAP', to: '/safety', cadence: 'halfYearly', refreshedOn: '2026-10-13' },
  { id: 'jncap', name: 'JNCAP / NASVA', to: '/safety', cadence: 'halfYearly', refreshedOn: '2026-10-13' },
  { id: 'cncap', name: 'C-NCAP / CATARC', to: '/safety', cadence: 'halfYearly', refreshedOn: '2026-10-13' },
  { id: 'kncap', name: 'KNCAP', to: '/safety', cadence: 'halfYearly', refreshedOn: '2026-10-13' },
  { id: 'iihs', name: 'IIHS', to: '/safety', cadence: 'halfYearly', refreshedOn: '2026-10-13' },
  {
    id: 'vehiclesdb',
    name: 'VehiclesDB: markets and popularity',
    to: '/stats',
    cadence: 'halfYearly',
    refreshedOn: '2026-10-13'
  },
  { id: 'rdwSpecs', name: 'RDW: vehicle specs (NL)', cadence: 'halfYearly', refreshedOn: '2026-10-09' },
  {
    id: 'fuel',
    name: 'EPA / EEA: fuel economy and CO2',
    to: '/fuel',
    cadence: 'halfYearly',
    refreshedOn: '2026-10-02'
  },
  { id: 'reviews', name: 'Reviews: Top Gear, infocar, press', cadence: 'halfYearly', refreshedOn: '2026-10-03' },
  { id: 'videos', name: 'Videos: infocar, YouTube', cadence: 'halfYearly', refreshedOn: '2026-10-11' },
  { id: 'wikiImages', name: 'Wikipedia: model photos', to: '/cars', cadence: 'halfYearly', refreshedOn: '2026-10-13' },
  {
    id: 'wikiPaint',
    name: 'Wikipedia: photo colour filter (our own scan)',
    to: '/cars',
    cadence: 'daily',
    job: 'wiki-paint',
    noteKey: 'dataStatus.note.wikiPaint',
    refreshedOn: '2026-11-08'
  },
  {
    id: 'wikiCandidates',
    name: 'Wikipedia: extra model photos (our own scan)',
    to: '/cars',
    cadence: 'daily',
    job: 'wiki-candidates',
    noteKey: 'dataStatus.note.wikiCandidates',
    refreshedOn: '2026-11-09'
  },
  {
    id: 'models3d',
    name: '3D and 360° models: Sketchfab, carshow360, winner360',
    cadence: 'halfYearly',
    refreshedOn: '2026-10-05'
  },
  {
    id: 'generations',
    name: 'Wikidata / Wikipedia: car generations',
    to: '/cars',
    cadence: 'yearly',
    refreshedOn: '2026-10-12'
  },
  { id: 'wikispecs', name: 'Wikipedia: generation specs', to: '/cars', cadence: 'yearly', refreshedOn: '2026-10-12' },
  { id: 'mot', name: 'DVSA: UK MOT common faults (2019, 2021-25)', cadence: 'yearly', refreshedOn: '2026-11-06' },
  { id: 'origin', name: 'Brand origin, VIN plants (WMI)', to: '/stats', cadence: 'yearly', refreshedOn: '2026-10-26' },
  { id: 'openEv', name: 'Open EV Data (upstream frozen at 2020-07)', cadence: 'frozen', refreshedOn: '2026-10-09' },
  {
    id: 'tuning3d',
    name: '3DTuning: car pages for "Customize in 3D"',
    to: '/cars',
    cadence: 'yearly',
    refreshedOn: '2026-11-04'
  },
  {
    id: 'oemLinks',
    name: 'Official OEM configurator links (Morgan, Lucid, Koenigsegg, Aston Martin, Lamborghini)',
    to: '/cars',
    cadence: 'yearly',
    refreshedOn: '2026-11-04'
  },
  {
    id: 'alarmHistory',
    name: 'Air-raid alert history (siren CSVs, official and volunteer)',
    to: '/alarms',
    cadence: 'yearly',
    refreshedOn: '2026-11-04'
  },
  {
    id: 'alarmBoundaries',
    name: 'UN OCHA COD-AB: oblast, raion and community outlines (2020)',
    to: '/alarms',
    cadence: 'frozen',
    refreshedOn: '2026-11-04',
    // Shapes in public/ukraine-alarm-{oblasts,raions,hromadas}.geojson: 27 + 139 + 1769
    staticCount: 1935
  },

  // Asked per request
  { id: 'nhtsa', name: 'NHTSA: VIN decoding, recalls, ratings', cadence: 'live' },
  { id: 'carapis', name: 'CarAPIS: cars for sale (Auto.ria, European marketplaces)', to: '/cars', cadence: 'live' }
]
