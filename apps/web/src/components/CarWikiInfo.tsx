import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'

import SectionInfo from '@/components/SectionInfo'
import SectionHeader from '@/components/SectionHeader'
import ShareButton from '@/components/ShareButton'
import { cn } from '@/lib/cn'
import { wikiInfoQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
}

/**
 * Wikipedia summary toggle — the article text is fetched only once the section is opened (the hero
 * photo has its own lightweight query, see `useCarHeroImageActions`). The trigger stays mounted
 * (no layout shift) and is disabled while the request is in flight.
 */
export default function CarWikiInfo({ brand, model, year }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isSharedWiki = searchParams.get('section') === 'wiki'
  const [open, setOpen] = useState(() => isSharedWiki)
  const sectionRef = useRef<HTMLDivElement>(null)
  const hasQuery = !!(brand || model)
  const wiki = useQuery({ ...wikiInfoQuery(brand ?? '', model ?? '', i18n.language, year), enabled: hasQuery && open })
  const data = wiki.isSuccess ? wiki.data : null

  useEffect(() => {
    if (isSharedWiki && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isSharedWiki])

  if (!hasQuery) return null

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="📖"
        title={t('wiki.title')}
        info={<SectionInfo section="wiki" title={t('wiki.title')} />}
        actions={<ShareButton section="wiki" label={t('share.button', { section: t('wiki.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('wiki.show')}
        hideLabel={t('wiki.hide')}
        disabled={wiki.isFetching}
      />

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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
