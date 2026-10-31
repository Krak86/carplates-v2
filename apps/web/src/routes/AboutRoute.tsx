import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'

import Card from '@/components/ui/Card'

/** `tile`: a plain coloured square (Tailwind bg class) for a source whose logo we are not cleared to show. */
type Source = { key: string; label: string; url?: string; icon?: string; mask?: string; tile?: string }

const SOURCES: readonly Source[] = [
  { key: 'dataGovUa', label: 'data.gov.ua', url: 'https://data.gov.ua', icon: '/icons/sources/datagovua.webp' },
  { key: 'nhtsa', label: 'NHTSA', url: 'https://www.nhtsa.gov', icon: '/icons/sources/nhtsa.webp' },
  { key: 'wikipedia', label: 'Wikipedia', url: 'https://www.wikipedia.org', mask: '/icons/wikipedia-w.svg' },
  { key: 'pixabay', label: 'Pixabay', url: 'https://pixabay.com', icon: '/icons/sources/pixabay.webp' },
  // No logo: Euro NCAP's terms do not allow reuse of its mark.
  { key: 'euroncap', label: 'Euro NCAP', url: 'https://www.euroncap.com', tile: 'bg-yellow-400' },
  { key: 'jncap', label: 'JNCAP / NASVA', url: 'https://www.nasva.go.jp', icon: '/icons/sources/jncap.webp' },
  { key: 'cncap', label: 'C-NCAP / CATARC', url: 'https://www.c-ncap.org.cn', icon: '/icons/sources/cncap.webp' },
  { key: 'kncap', label: 'KNCAP', url: 'https://www.kncap.org', icon: '/icons/sources/kncap.webp' },
  { key: 'iihs', label: 'IIHS', url: 'https://www.iihs.org', icon: '/icons/sources/iihs.webp' },
  { key: 'epa', label: 'EPA / fueleconomy.gov', url: 'https://www.fueleconomy.gov', icon: '/icons/sources/epa.webp' },
  { key: 'eea', label: 'EEA', url: 'https://www.eea.europa.eu', icon: '/icons/sources/eea.svg' },
  { key: 'vehiclesdb', label: 'VehiclesDB', url: 'https://vehiclesdb.com', icon: '/icons/sources/vehiclesdb.webp' },
  {
    key: 'mot',
    label: 'DVSA MOT',
    url: 'https://www.data.gov.uk/dataset/e3939ef8-30c7-4ca8-9c7c-ad9475cc9b2f/anonymised_mot_test',
    mask: '/icons/sources/dvsa.svg'
  },
  {
    key: 'ca',
    label: 'Transport Canada',
    url: 'https://tc.canada.ca/en/road-transportation',
    tile: 'bg-red-700'
  },
  { key: 'rdw', label: 'RDW', url: 'https://opendata.rdw.nl', icon: '/icons/sources/rdw.webp' },
  {
    key: 'ev',
    label: 'Open EV Data',
    url: 'https://github.com/OpenChargingCloud/open-ev-data',
    icon: '/icons/sources/github.webp'
  },
  {
    key: 'wikidata',
    label: 'Wikidata / Wikipedia',
    url: 'https://www.wikidata.org',
    icon: '/icons/sources/wikidata.svg'
  },
  {
    key: 'belastingdienst',
    label: 'Belastingdienst',
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/bpm/content/bpm-afschrijving-koerslijst-taxatierapport-forfaitaire-tabel',
    icon: '/icons/sources/belastingdienst.webp'
  },
  {
    key: 'nationalPolice',
    label: 'National Police of Ukraine',
    url: 'https://data.gov.ua/dataset/2cd12755-834b-4c43-9026-fe356ce93af5',
    tile: 'bg-blue-700'
  },
  { key: 'setam', label: 'SETAM', url: 'https://setam.net.ua', tile: 'bg-blue-700' },
  { key: 'hsc', label: 'MVS HSC open data', url: 'https://solutions.mvs.gov.ua', tile: 'bg-blue-700' },
  { key: 'stolenIn', label: 'stolen.in.ua', url: 'https://stolen.in.ua', icon: '/icons/sources/stolenin.svg' },
  { key: 'bdr', label: 'MVS (bdr.mvs.gov.ua)', url: 'https://bdr.mvs.gov.ua', icon: '/icons/bdr.svg' },
  { key: 'mtsbu', label: 'MTSBU', url: 'https://policy.mtsbu.ua', icon: '/icons/sources/mtsbu.webp' },
  { key: 'shtrafua', label: 'ShtrafUA', url: 'https://shtrafua.com', icon: '/icons/shtrafua.png' },
  // No logo: the site grants no reuse of its mark.
  {
    key: 'customs',
    label: 'cabinet.customs.gov.ua',
    url: 'https://cabinet.customs.gov.ua/vtzcheck',
    tile: 'bg-blue-700'
  },
  { key: 'radaLaws', label: 'zakon.rada.gov.ua', url: 'https://zakon.rada.gov.ua', tile: 'bg-blue-700' },
  { key: 'diia', label: 'Diia', url: 'https://diia.gov.ua', tile: 'bg-slate-500' },
  { key: 'avtonomera', label: 'avtonomera.net.ua', url: 'https://avtonomera.net.ua', tile: 'bg-slate-500' },
  { key: 'tsn', label: 'TSN', url: 'https://tsn.ua', tile: 'bg-slate-500' },
  { key: 'aec', label: 'AEC Solutions', url: 'https://www.aecsolutions.com', tile: 'bg-slate-500' },
  { key: 'pdr', label: 'pdr.infotech.gov.ua', url: 'https://pdr.infotech.gov.ua', tile: 'bg-blue-700' },
  {
    key: 'patrolPolice',
    label: 'Patrol Police of Ukraine',
    url: 'https://patrolpolice.gov.ua/statystyka/',
    tile: 'bg-blue-700'
  },
  {
    key: 'irsu',
    label: 'Infrastructure Restoration Agency',
    url: 'https://data.gov.ua/dataset/9b6a7292-b0cd-419e-8143-19da0661edfb',
    tile: 'bg-blue-700'
  },
  { key: 'drive2', label: 'DRIVE2', url: 'https://www.drive2.ru', icon: '/icons/drive2.png' },
  {
    key: 'flagIcons',
    label: 'flag-icons',
    url: 'https://github.com/lipis/flag-icons',
    icon: '/icons/sources/github.webp'
  },
  { key: 'osm', label: 'OpenStreetMap', url: 'https://www.openstreetmap.org', tile: 'bg-green-700' },
  { key: 'autoria', label: 'Auto.RIA / OLX', url: 'https://auto.ria.com', tile: 'bg-slate-500' },
  { key: 'infocar', label: 'infocar.ua', url: 'https://www.infocar.ua', icon: '/icons/infocar.png' },
  // Auction link-outs (AuctionCheck): no logos — commercial marks, no licence found in their terms; plain tiles only.
  { key: 'bidfax', label: 'Bidfax', url: 'https://bidfax.info', tile: 'bg-slate-500' },
  { key: 'bidcars', label: 'Bid.cars', url: 'https://bid.cars', tile: 'bg-slate-500' },
  { key: 'poctra', label: 'Poctra', url: 'https://poctra.com', tile: 'bg-slate-500' },
  { key: 'copart', label: 'Copart', url: 'https://www.copart.com', tile: 'bg-slate-500' },
  { key: 'iaai', label: 'IAA', url: 'https://www.iaai.com', tile: 'bg-slate-500' },
  { key: 'statvin', label: 'Stat.vin', url: 'https://stat.vin', tile: 'bg-slate-500' },
  { key: 'openlane', label: 'OPENLANE Europe', url: 'https://www.openlane.eu', tile: 'bg-slate-500' },
  { key: 'encar', label: 'Encar', url: 'https://www.encar.com', tile: 'bg-slate-500' },
  { key: 'hondaUa', label: 'honda.ua', url: 'https://www.honda.ua', icon: '/icons/sources/honda.webp' },
  { key: 'itc', label: 'ITC.ua', url: 'https://itc.ua/ua/tag/test-drayv-ua/', icon: '/icons/itc.webp' },
  { key: 'mezha', label: 'Mezha', url: 'https://mezha.ua/tag/test-drayv/', icon: '/icons/mezha.webp' },
  { key: 'eauto', label: 'eauto.org.ua', url: 'https://eauto.org.ua', icon: '/icons/sources/eauto.svg' },
  { key: 'autoua', label: 'autoua.net', url: 'https://autoua.net', icon: '/icons/sources/autoua.webp' },
  { key: 'novynyLive', label: 'novyny.live', url: 'https://novyny.live', icon: '/icons/sources/novynylive.svg' },
  { key: 'topgir', label: 'topgir.com.ua', url: 'https://topgir.com.ua', icon: '/icons/sources/topgir.webp' },
  {
    key: 'caranddriver',
    label: 'Car and Driver',
    url: 'https://www.caranddriver.com',
    icon: '/icons/sources/caranddriver.svg'
  },
  { key: 'motor1', label: 'Motor1', url: 'https://www.motor1.com', icon: '/icons/sources/motor1.webp' },
  { key: 'carscoops', label: 'Carscoops', url: 'https://www.carscoops.com', icon: '/icons/sources/carscoops.webp' },
  {
    key: 'autoevolution',
    label: 'autoevolution',
    url: 'https://www.autoevolution.com',
    icon: '/icons/sources/autoevolution.webp'
  },
  { key: 'edrive', label: 'e-drive.com.ua', url: 'https://e-drive.com.ua', icon: '/icons/edrive.png' },
  { key: 'topgear', label: 'TopGear', url: 'https://www.topgear.com/car-reviews', icon: '/icons/topgear.webp' },
  { key: 'carshow360', label: 'CarShow360', url: 'https://carshow360.net', icon: '/icons/sources/carshow360.webp' },
  { key: 'winner', label: 'Winner Imports', url: 'https://stock.winner.ua', icon: '/icons/sources/winner.svg' },
  { key: 'sketchfab', label: 'Sketchfab', url: 'https://sketchfab.com', icon: '/icons/sources/sketchfab.webp' },
  {
    key: 'wikimedia',
    label: 'Wikimedia Commons',
    url: 'https://commons.wikimedia.org',
    icon: '/icons/sources/wikimedia.webp'
  },
  { key: 'bluesky', label: 'Bluesky', url: 'https://bsky.app', icon: '/icons/sources/bluesky.webp' },
  {
    key: 'stackexchange',
    label: 'Stack Exchange',
    url: 'https://mechanics.stackexchange.com',
    icon: '/icons/sources/stackexchange.webp'
  },
  { key: 'lemmy', label: 'Lemmy', url: 'https://lemmy.world', icon: '/icons/sources/lemmy.webp' },
  { key: 'nbu', label: 'NBU', url: 'https://bank.gov.ua', icon: '/icons/sources/nbu.webp' },
  {
    key: 'yahooFinance',
    label: 'Yahoo Finance',
    url: 'https://finance.yahoo.com',
    icon: '/icons/sources/yahoofinance.webp'
  },
  { key: 'travic', label: 'Travic', url: 'https://travic.app', icon: '/icons/sources/travic.webp' },
  {
    key: 'googleMaps',
    label: 'Google Maps',
    url: 'https://www.google.com/maps',
    icon: '/icons/sources/googlemaps.webp'
  },
  { key: 'brandSites', label: 'Importer & brand sites', icon: '/icons/official-site.svg' },
  {
    key: 'racer',
    label: 'javascript-racer',
    url: 'https://github.com/jakesgordon/javascript-racer',
    mask: '/icons/sources/github.webp'
  },
  { key: 'kenney', label: 'Kenney', url: 'https://kenney.nl', icon: '/icons/sources/kenney.webp' },
  {
    key: 'googleTranslate',
    label: 'Google Translate',
    url: 'https://translate.google.com',
    icon: '/logos/google-translate.svg'
  },
  {
    key: 'opusMt',
    label: 'Hugging Face / OPUS-MT',
    url: 'https://huggingface.co/Helsinki-NLP',
    icon: '/icons/sources/huggingface.svg'
  },
  // No logos: Apple's and Google's marks are not cleared for reuse.
  {
    key: 'carplay',
    label: 'Apple CarPlay / Android Auto',
    url: 'https://www.apple.com/ios/carplay/',
    tile: 'bg-slate-500'
  },
  { key: 'eurlex', label: 'EUR-Lex', url: 'https://eur-lex.europa.eu/eli/reg/2019/2144/oj', tile: 'bg-blue-700' },
  {
    key: 'fastAlpr',
    label: 'fast-alpr / RapidOCR',
    url: 'https://github.com/ankandrew/fast-alpr',
    icon: '/icons/sources/github.webp'
  },
  // No logo: commercial mark, no licence found; plain tile.
  {
    key: 'plateRecognizer',
    label: 'Plate Recognizer',
    url: 'https://platerecognizer.com',
    tile: 'bg-slate-500'
  },
  { key: 'youtube', label: 'YouTube', url: 'https://www.youtube.com', icon: '/icons/sources/youtube.webp' },
  {
    key: 'googleSignIn',
    label: 'Google Sign-In',
    url: 'https://developers.google.com/identity',
    icon: '/icons/sources/googlesignin.webp'
  },
  {
    key: 'telegram',
    label: 'Telegram Login',
    url: 'https://core.telegram.org/widgets/login',
    icon: '/icons/sources/telegram.webp'
  },
  { key: 'posthog', label: 'PostHog', url: 'https://posthog.com', icon: '/icons/sources/posthog.webp' },
  { key: 'sentry', label: 'Sentry', url: 'https://sentry.io', icon: '/icons/sources/sentry.webp' },
  // No logos below: no licence found for the marks; plain tiles only.
  { key: 'cloudflare', label: 'Cloudflare', url: 'https://www.cloudflare.com', tile: 'bg-orange-600' },
  {
    key: 'turnstile',
    label: 'Cloudflare Turnstile',
    url: 'https://www.cloudflare.com/application-services/products/turnstile/',
    tile: 'bg-orange-600'
  },
  { key: 'resend', label: 'Resend', url: 'https://resend.com', tile: 'bg-slate-500' },
  { key: 'disqus', label: 'Disqus', url: 'https://disqus.com', tile: 'bg-slate-500' },
  {
    key: 'notoSans',
    label: 'Noto Sans',
    url: 'https://fonts.google.com/noto/specimen/Noto+Sans',
    tile: 'bg-slate-500'
  },
  // No logo: the typeface page does not grant reuse of the Diia / Ministry marks.
  { key: 'eUkraine', label: 'e-Ukraine typeface', url: 'https://thedigital.gov.ua/fonts', tile: 'bg-blue-700' },
  { key: 'zakon', label: 'ZAKON typeface', url: 'https://mincult.gov.ua/zakon/', tile: 'bg-blue-700' },
  // No logo: AI-generated banner pictures; plain tile.
  { key: 'fooocus', label: 'Fooocus', url: 'https://github.com/lllyasviel/Fooocus', tile: 'bg-slate-500' },
  { key: 'carvx', label: 'CarVX', url: 'https://carvx.jp', tile: 'bg-slate-500' },
  { key: 'checkcar', label: 'Checkcar.vin', url: 'https://checkcar.vin', tile: 'bg-slate-500' },
  {
    key: 'chinavehiclehistory',
    label: 'China Vehicle History',
    url: 'https://www.chinavehiclehistory.com',
    tile: 'bg-slate-500'
  },
  { key: 'carvertical', label: 'carVertical', url: 'https://www.carvertical.com', tile: 'bg-slate-500' },
  { key: 'autodna', label: 'AutoDNA', url: 'https://www.autodna.com', tile: 'bg-slate-500' },
  { key: 'carfax', label: 'Carfax', url: 'https://www.carfax.com', tile: 'bg-slate-500' },
  { key: 'autocheck', label: 'AutoCheck', url: 'https://www.autocheck.com', tile: 'bg-slate-500' },
  {
    key: 'historiaPojazdu',
    label: 'Historia Pojazdu (gov.pl)',
    url: 'https://historiapojazdu.gov.pl',
    tile: 'bg-blue-700'
  }
]

function SourceAvatar({ source }: { source: Source }): ReactNode {
  if (source.icon) {
    return <img src={source.icon} alt="" width={32} height={32} className="size-8 shrink-0 rounded-md object-contain" />
  }

  if (source.tile) {
    return <span aria-hidden className={`size-8 shrink-0 rounded-md ${source.tile}`} />
  }

  if (source.mask) {
    return (
      <span
        aria-hidden
        className="size-8 shrink-0 bg-[var(--color-fg)]"
        style={{
          maskImage: `url(${source.mask})`,
          maskSize: '70%',
          maskRepeat: 'no-repeat',
          maskPosition: 'center'
        }}
      />
    )
  }

  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-border)] text-sm font-semibold text-[var(--color-muted)]"
    >
      {source.label.charAt(0).toUpperCase()}
    </span>
  )
}

const FEATURES = [
  'lookup',
  'wanted',
  'otherSources',
  'vin',
  'origin',
  'recognition',
  'share',
  'advanced',
  'specs',
  'performance',
  'safety',
  'roadSafety',
  'fuel',
  'value',
  'auctions',
  'uaAuctions',
  'reviews',
  'media',
  'verify',
  'guides',
  'stats',
  'catalog',
  'compare',
  'news',
  'whatsnew',
  'race',
  'play',
  'relax',
  'account',
  'copy',
  'discuss',
  'sharecard',
  'appearance',
  'digest',
  'translate',
  'pwa',
  'agents',
  'roadmap',
  'drawings',
  'contact'
] as const

// Lazy-loaded (see App.tsx).
export default function AboutRoute(): ReactNode {
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  const { hash } = useLocation()
  const sourcesRef = useRef<HTMLDivElement>(null)

  // `/about#sources` (linked from privacy/terms): the router doesn't scroll to hashes itself.
  useEffect(() => {
    if (hash === '#sources') sourcesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <article className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold">{t('about.heading')}</h1>

      <Card className="space-y-4 text-sm text-[var(--color-fg)]">
        <p>{t('about.p1')}</p>
        <p>{t('about.p2')}</p>
        <p>{t('about.p3')}</p>
        <p>{t('about.p4')}</p>
        <p>{t('about.p5')}</p>
        <p className="text-[var(--color-muted)]">
          {t('about.plateNotice')}{' '}
          <a
            href="https://leopolis.news/mvs-zakrylo-dani-pro-nomerni-znaky-avtomobiliv-biznes-vymagaye-skasuvaty-rishennya/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] underline"
          >
            {t('about.plateNoticeSource')} ↗
          </a>
        </p>

        <div className="border-t border-[var(--color-border)] pt-4">
          <h2 className="font-semibold">{t('about.licenseHeading')}</h2>
          <p className="mt-2">
            {t('about.copyright', { year })}{' '}
            <a
              href="https://carsua.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] underline"
            >
              carsua.app ↗
            </a>
          </p>
          <p className="mt-2">{t('about.licensePermission')}</p>
          <p className="mt-2">{t('about.licenseNotice')}</p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">{t('about.licenseWarranty')}</p>
          <p className="mt-2">
            <Link to="/privacy" className="text-[var(--color-primary)] underline">
              {t('legal.privacy.heading')}
            </Link>
            {' · '}
            <Link to="/terms" className="text-[var(--color-primary)] underline">
              {t('legal.terms.heading')}
            </Link>
            {' · '}
            <Link to="/contact" className="text-[var(--color-primary)] underline">
              {t('contact.heading')}
            </Link>
          </p>
        </div>
      </Card>

      <Card className="space-y-3 text-sm text-[var(--color-fg)]">
        <h2 className="font-semibold">{t('about.briefHeading')}</h2>
        <ul className="grid list-disc gap-x-6 gap-y-1 pl-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(key => (
            <li key={key}>{t(`about.brief.${key}`)}</li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-3 text-sm text-[var(--color-fg)]">
        <h2 className="font-semibold">{t('about.featuresHeading')}</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          {FEATURES.map(key => (
            <li key={key}>{t(`about.feature.${key}`)}</li>
          ))}
        </ul>
      </Card>

      <Card ref={sourcesRef} className="scroll-mt-20 space-y-3 text-sm text-[var(--color-fg)]">
        <h2 className="font-semibold">{t('about.sourcesHeading')}</h2>
        <ul className="space-y-3">
          {SOURCES.map(source => (
            <li key={source.key} className="flex items-start gap-3">
              <SourceAvatar source={source} />

              <div className="min-w-0">
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--color-primary)] underline"
                  >
                    {source.label} ↗
                  </a>
                ) : (
                  <span className="font-medium">{source.label}</span>
                )}
                <span className="text-[var(--color-muted)]"> - {t(`about.source.${source.key}`)}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </article>
  )
}
