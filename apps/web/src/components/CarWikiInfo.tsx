import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { wikiDomain } from '@carplates/shared'

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

/** Wikipedia subdomain → chip label (Ukrainian's subdomain is `uk`, the app's code `ua`). */
const WIKI_LANG_CHIP: Readonly<Record<string, string>> = { uk: 'UA', ru: 'RU', en: 'EN' }

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
  const [expanded, setExpanded] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const hasQuery = !!(brand || model)
  const wiki = useQuery({ ...wikiInfoQuery(brand ?? '', model ?? '', i18n.language, year), enabled: hasQuery && open })
  const data = wiki.isSuccess ? wiki.data : null
  // The article exists only in another edition: its text stays behind a language chip until clicked.
  const isFallback = !!data?.articleLang && data.articleLang !== wikiDomain(i18n.language)
  const textVisible = !isFallback || showFallback

  useEffect(() => {
    if (isSharedWiki && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isSharedWiki])

  if (!hasQuery) return null

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon={
          <span
            className="inline-block h-4 w-4 bg-current align-middle"
            style={{
              maskImage: 'url(/icons/wikipedia-w.svg)',
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center'
            }}
          />
        }
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
            {wiki.isError && <p className="text-base text-muted">{t('wiki.unavailable')}</p>}
            {data && !data.found && <p className="text-base text-muted">{t('wiki.none')}</p>}

            {data?.found && (
              <div>
                {data.description && (
                  <p className="mb-1 text-sm text-muted">
                    {[data.title, data.description].filter(Boolean).join(' — ')}
                  </p>
                )}
                {isFallback && (
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span>{t('wiki.otherLang')}</span>
                    <button
                      type="button"
                      onClick={() => setShowFallback(v => !v)}
                      aria-expanded={showFallback}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-0.5 font-medium transition-colors hover:text-fg"
                    >
                      {WIKI_LANG_CHIP[data.articleLang ?? ''] ?? data.articleLang?.toUpperCase()}
                      <span aria-hidden className={cn('transition-transform', showFallback && 'rotate-180')}>
                        ▾
                      </span>
                    </button>
                  </div>
                )}
                {data.extract && textVisible && <p className="text-base whitespace-pre-line">{data.extract}</p>}

                {data.more && textVisible && (
                  <>
                    <div
                      className={cn(
                        'grid transition-[grid-template-rows] duration-300 ease-in-out',
                        expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      )}
                    >
                      <div aria-hidden={!expanded} className="overflow-hidden">
                        <div className="mt-2 space-y-2 text-base">
                          {data.more.split('\n\n').map(block =>
                            block.startsWith('## ') ? (
                              <h4 key={block} className="pt-1 font-semibold">
                                {block.slice(3)}
                              </h4>
                            ) : (
                              <p key={block} className="whitespace-pre-line">
                                {block}
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpanded(v => !v)}
                      aria-expanded={expanded}
                      className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-full border border-border px-3 py-0.5 text-sm text-muted transition-colors hover:text-fg"
                    >
                      {expanded ? t('wiki.readLess') : t('wiki.readMore')}
                      <span aria-hidden className={cn('transition-transform', expanded && 'rotate-180')}>
                        ▾
                      </span>
                    </button>
                  </>
                )}

                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-muted">
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
