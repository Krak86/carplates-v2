import { Suspense, lazy, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import GamesNav from '@/components/game/GamesNav'
import LayersPanelSkeleton from '@/components/LayersPanelSkeleton'
import ShareLayoutButton from '@/components/ShareLayoutButton'
import Card from '@/components/ui/Card'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useUiStore } from '@/store/ui-store'

const LayersPanel = lazy(() => import('@/components/LayersPanel'))

const BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm shadow hover:bg-[var(--color-surface)]'

// Lazy-loaded (see App.tsx). The page is the background layout behind it plus a small card: what this is, the background
// picker (the header one is hidden on phones) and the zen switch, which hides everything but the background.
export default function RelaxRoute(): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const zen = useUiStore(s => s.zen)
  const setZen = useUiStore(s => s.setZen)

  // Zen belongs to this page: leaving it (or Escape) always brings the header and footer back.
  useEffect(() => (): void => setZen(false), [setZen])
  useEffect(() => {
    if (!zen) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setZen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return (): void => document.removeEventListener('keydown', handleKeyDown)
  }, [zen, setZen])

  if (zen) {
    return (
      <button
        type="button"
        onClick={() => setZen(false)}
        className={`${BUTTON_CLASS} fixed right-4 bottom-4 z-30 opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100`}
      >
        {t('relax.zen.exit')}
      </button>
    )
  }

  return (
    <article className="mx-auto max-w-6xl space-y-4">
      <GamesNav />

      <Card className="max-w-xl space-y-3 bg-[var(--color-bg)]/80 backdrop-blur-md">
        <h1 className="text-2xl font-bold">
          <span aria-hidden>🧘</span> {t('relax.title')}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">{t('relax.intro')}</p>

        <ol className="list-decimal space-y-1 pl-5 text-sm text-[var(--color-muted)]">
          <li>{t('relax.step.pick')}</li>
          <li>{t('relax.step.zen')}</li>
          <li>{t('relax.step.share')}</li>
        </ol>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setZen(true)} className={BUTTON_CLASS}>
            <span aria-hidden>🧘</span> {t('relax.zen.enter')}
          </button>
          <ShareLayoutButton showOnPhotos className={BUTTON_CLASS} />
        </div>
        <p className="text-xs text-[var(--color-muted)]">{t('relax.zen.hint')}</p>
      </Card>

      {online && (
        <section aria-label={t('layers.button')} className="space-y-2">
          <h2 className="text-sm font-medium">{t('layers.button')}</h2>
          <Suspense fallback={<LayersPanelSkeleton />}>
            <LayersPanel />
          </Suspense>
        </section>
      )}
    </article>
  )
}
