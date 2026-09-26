import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import type { WikiInfo } from '@carplates/shared'

import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  wiki: UseQueryResult<WikiInfo>
  hasQuery: boolean
}

/**
 * Wikipedia summary toggle — the fetch itself runs eagerly in `useCarWikiActions` (also
 * feeding the hero background), this only gates showing the result. The trigger stays
 * mounted throughout (no layout shift) and is just disabled until the fetch settles.
 */
export default function CarWikiInfo({ wiki, hasQuery }: Props): ReactNode {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const isSharedWiki = searchParams.get('section') === 'wiki'
  const [open, setOpen] = useState(() => isSharedWiki)
  const sectionRef = useRef<HTMLDivElement>(null)
  const data = wiki.isSuccess ? wiki.data : null
  const image = data?.image
  const creditParts = [image?.attribution?.author, image?.attribution?.license].filter(Boolean)

  useEffect(() => {
    if (isSharedWiki && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isSharedWiki])

  if (!hasQuery) return null

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <div className="flex items-center justify-between text-base">
        <span className="text-base font-semibold">{t('wiki.title')}</span>
        <div className="flex items-center gap-1.5">
          {open && <ShareButton section="wiki" label={t('share.button', { section: t('wiki.title') })} />}
          <button
            type="button"
            aria-expanded={open}
            disabled={wiki.isPending}
            onClick={() => setOpen(v => !v)}
            className="group flex items-center gap-1.5 rounded-full bg-[var(--color-surface)]/20 px-3 py-1 text-[var(--color-primary)] disabled:cursor-wait disabled:opacity-50"
          >
            <span aria-hidden className="no-underline">
              📖
            </span>
            <span className="underline group-hover:no-underline">{open ? t('wiki.hide') : t('wiki.show')}</span>
            <span
              aria-hidden
              className={cn('inline-block no-underline transition-transform duration-200', open && 'rotate-180')}
            >
              ▾
            </span>
          </button>
        </div>
      </div>

      <div
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-3">
            {wiki.isError && <p className="text-base text-[var(--color-muted)]">{t('wiki.unavailable')}</p>}
            {data && !data.found && <p className="text-base text-[var(--color-muted)]">{t('wiki.none')}</p>}

            {data?.found && (
              <div>
                {image && (
                  <img
                    src={image.url}
                    alt={data.title ?? ''}
                    className="mb-2 aspect-video w-full rounded-md border border-[var(--color-border)] object-cover"
                  />
                )}
                {data.extract && <p className="text-base whitespace-pre-line">{data.extract}</p>}
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-[var(--color-muted)]">
                  {data.pageUrl && (
                    <a
                      href={data.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-primary)] underline"
                    >
                      {t('wiki.source')}
                    </a>
                  )}
                  {creditParts.length > 0 && <span>{t('wiki.imageCredit', { credit: creditParts.join(', ') })}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
