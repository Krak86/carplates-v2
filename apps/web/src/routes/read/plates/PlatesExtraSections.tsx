import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { pick } from '@/routes/read/helpers'
import {
  DIIA_ORDER_URL,
  NOT_COVERED,
  OLD_PLATES_NOTE,
  ORDER_RULES,
  ORDER_STEPS,
  ORDER_VIDEO_URL,
  PLATE_TYPES,
  SOURCES
} from '@/routes/read/plates/content'

/** Photos of plates seen on the road (files in `public/read/legacy/`); `plate` is the text on the plate, as captioned. */
const LEGACY_PHOTOS = [
  { file: 'gaz-69-dp', plate: 'П 8388 ДП' },
  { file: 'gaz-69-ua', plate: 'А 6144 ІВ' },
  { file: 'vaz-2105', plate: '808-06 АВ' },
  { file: 'gaz-66', plate: '245-60 КА' },
  { file: 'tractor-ba', plate: '24320 ВА' },
  { file: 'tractor-ce', plate: '03430 СЕ' }
] as const

type LinkProps = {
  href: string
  children: ReactNode
}

function ExternalLink({ href, children }: LinkProps): ReactNode {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary">
      {children} ↗
    </a>
  )
}

/** Soviet-era plates with photos: what they look like and why the registry rarely has them. */
export function LegacySection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="legacy" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.plates.legacyTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.plates.legacyIntro')}</p>

      <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LEGACY_PHOTOS.map(({ file, plate }) => (
          <li key={file}>
            <figure>
              <img
                src={`/read/legacy/${file}.webp`}
                alt={t('read.plates.legacyAlt', { plate })}
                loading="lazy"
                decoding="async"
                className="aspect-[3/4] w-full rounded-lg border border-border object-cover"
              />
              <figcaption className="mt-1 text-center font-mono text-sm">{plate}</figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <p className="mb-2 text-sm text-muted">{t('read.plates.legacyNote')}</p>
      <p className="text-sm text-muted">{pick(OLD_PLATES_NOTE, i18n.language)}</p>
    </Card>
  )
}

/** Every plate type from the HSC samples (images cropped from the PDF), and how far plates can be verified. */
export function SpecialSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="special" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.plates.specialTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.plates.specialIntro')}</p>

      <ul className="mb-3 space-y-4">
        {PLATE_TYPES.map(type => {
          const title = pick(type.title, i18n.language)
          return (
            <li key={type.id} className="border-t border-border/50 pt-3 first:border-t-0 first:pt-0">
              <h3 className="mb-1 font-medium">{title}</h3>

              {type.images.length > 0 && (
                <div className="mb-2 flex flex-wrap items-end gap-3">
                  {type.images.map(file => (
                    <img
                      key={file}
                      src={`/read/types/${file}.webp`}
                      alt={title}
                      loading="lazy"
                      decoding="async"
                      className="h-auto max-h-24 w-auto max-w-full"
                    />
                  ))}
                </div>
              )}

              <p className="text-sm">{pick(type.text, i18n.language)}</p>

              {type.link && (
                <p className="mt-1 text-sm">
                  <ExternalLink href={type.link.url}>{pick(type.link.label, i18n.language)}</ExternalLink>
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <p className="mb-2 text-sm text-muted">{pick(NOT_COVERED, i18n.language)}</p>
      <p className="text-sm text-muted">{t('read.plates.specialVerify')}</p>
    </Card>
  )
}

/** How to order a custom plate (online / offline), what it costs, the refusal rules, and the sources of this guide. */
export function OrderSection(): ReactNode {
  const { t, i18n } = useTranslation()

  return (
    <Card id="order" className="scroll-mt-20">
      <h2 className="mb-2 text-xl font-semibold">{t('read.plates.orderTitle')}</h2>
      <p className="mb-3 text-muted">{t('read.plates.orderIntro')}</p>

      <ul className="mb-3 list-disc space-y-1 pl-5">
        {ORDER_STEPS.map(step => (
          <li key={step.en}>{pick(step, i18n.language)}</li>
        ))}
      </ul>

      <p className="mb-3 text-sm text-muted">{pick(ORDER_RULES, i18n.language)}</p>

      <p className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
        <ExternalLink href={DIIA_ORDER_URL}>{t('read.plates.orderCabinet')}</ExternalLink>
        <ExternalLink href={ORDER_VIDEO_URL}>{t('read.plates.orderVideo')}</ExternalLink>
      </p>

      <h3 className="mb-1 text-sm font-medium">{t('read.plates.sources')}</h3>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {SOURCES.map(source => (
          <li key={source.url}>
            <ExternalLink href={source.url}>{pick(source.label, i18n.language)}</ExternalLink>
          </li>
        ))}
      </ul>
    </Card>
  )
}
