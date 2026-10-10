import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'

/** `tile`: a plain coloured square (Tailwind bg class) for a source whose logo we are not cleared to show. */
type Source = { key: string; label: string; url?: string; icon?: string; mask?: string; tile?: string }

const SOURCES: readonly Source[] = [
  { key: 'dataGovUa', label: 'data.gov.ua', url: 'https://data.gov.ua', icon: '/icons/sources/datagovua.webp' },
  { key: 'nhtsa', label: 'NHTSA', url: 'https://www.nhtsa.gov', icon: '/icons/sources/nhtsa.webp' },
  { key: 'wikipedia', label: 'Wikipedia', url: 'https://www.wikipedia.org', mask: '/icons/wikipedia-w.svg' },
  { key: 'pixabay', label: 'Pixabay', url: 'https://pixabay.com', icon: '/icons/sources/pixabay.webp' },
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
    url: 'https://www.data.gov.uk/dataset/anonymised_mot_test',
    tile: 'bg-slate-700'
  },
  {
    key: 'ca',
    label: 'Transport Canada',
    url: 'https://tc.canada.ca/en/road-transportation/motor-vehicle-safety',
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
    key: 'belastingdienst',
    label: 'Belastingdienst',
    url: 'https://www.belastingdienst.nl/wps/wcm/connect/nl/bpm/content/bpm-afschrijving-koerslijst-taxatierapport-forfaitaire-tabel',
    icon: '/icons/sources/belastingdienst.webp'
  },
  { key: 'infocar', label: 'infocar.ua', url: 'https://www.infocar.ua', icon: '/icons/infocar.png' },
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
  { key: 'youtube', label: 'YouTube', url: 'https://www.youtube.com', icon: '/icons/sources/youtube.webp' },
  {
    key: 'googleSignIn',
    label: 'Google Sign-In',
    url: 'https://developers.google.com/identity',
    icon: '/icons/sources/googlesignin.webp'
  },
  { key: 'posthog', label: 'PostHog', url: 'https://posthog.com', icon: '/icons/sources/posthog.webp' },
  { key: 'sentry', label: 'Sentry', url: 'https://sentry.io', icon: '/icons/sources/sentry.webp' }
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

// Lazy-loaded (see App.tsx).
export default function AboutRoute(): ReactNode {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <article className="mx-auto max-w-content space-y-4">
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
        </div>
      </Card>

      <Card className="space-y-3 text-sm text-[var(--color-fg)]">
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
                <span className="text-[var(--color-muted)]"> — {t(`about.source.${source.key}`)}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </article>
  )
}
