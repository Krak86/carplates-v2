import { Suspense, lazy, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { type VehicleKind } from '@carplates/shared'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const RaceGameModal = lazy(() => import('@/components/game/RaceGameModal'))

/** The promo eases in a few seconds after the card shows, so it never competes with the result itself. */
const REVEAL_DELAY_MS = 3000
/** Once it has appeared in this session, later result cards show it at once (still with the fade). */
let revealedThisSession = false

const REVEAL_CLASS =
  'absolute transition-[opacity,translate] duration-700 ease-out starting:translate-x-4 starting:opacity-0 motion-reduce:transition-none'

type Props = {
  color: string
  kind: VehicleKind | null
  bodyText?: string | null
  plate: string
}

/**
 * Promo for the "test drive your car" racer, floated beside the result card (the parent is `relative`). Desktop only:
 * a banner on wide screens (`xl`, where the side gutter has room), a compact 🎮 circle on `lg`, nothing below — the game
 * needs a keyboard. Online only: the game is a lazy chunk kept out of the PWA precache.
 */
export default function RaceGameButton({ color, kind, bodyText, plate }: Props): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const [searchParams] = useSearchParams()
  // A shared link (`?section=race&tab=<settings>`) opens the modal straight on the intro with those settings.
  const isShared = searchParams.get('section') === 'race'
  const [open, setOpen] = useState(() => isShared)
  const [sharedTab] = useState(() => (isShared ? searchParams.get('tab') : null))

  const [revealed, setRevealed] = useState(() => revealedThisSession)

  useEffect(() => {
    if (revealed) return
    const timer = setTimeout(() => {
      revealedThisSession = true
      setRevealed(true)
    }, REVEAL_DELAY_MS)
    return () => clearTimeout(timer)
  }, [revealed])

  const handleOpen = (): void => setOpen(true)
  const title = online ? t('race.open') : t('offline.needsConnection')

  return (
    <>
      {revealed && (
        <div className={REVEAL_CLASS + ' top-0 left-full ml-4 hidden xl:block'}>
          <button
            type="button"
            onClick={handleOpen}
            disabled={!online}
            aria-label={t('race.open')}
            title={title}
            className="group flex w-40 cursor-pointer flex-col items-start gap-2 overflow-hidden rounded-2xl bg-linear-to-b from-sky-50 to-sky-200 p-4 text-left shadow-lg ring-1 ring-sky-900/10 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <span className="text-[10px] font-bold tracking-widest text-sky-700 uppercase">
              {t('race.banner.badge')}
            </span>
            <span className="text-xl leading-tight font-extrabold tracking-tight text-sky-950 uppercase">
              {t('race.banner.title')}
            </span>
            <span className="text-xs leading-snug text-sky-900/80">{t('race.banner.sub')}</span>

            <span
              aria-hidden
              className="my-1 self-center text-5xl leading-none transition-transform duration-300 group-hover:scale-110"
            >
              🚗
            </span>

            <span className="inline-flex items-center gap-1 self-center rounded-full bg-sky-900 px-3 py-1.5 text-xs font-bold text-white transition-colors group-hover:bg-sky-700">
              {t('race.banner.cta')} <span aria-hidden>→</span>
            </span>
          </button>
        </div>
      )}

      {revealed && (
        <div className={REVEAL_CLASS + ' top-0 -right-14 hidden lg:block xl:hidden'}>
          <button
            type="button"
            onClick={handleOpen}
            disabled={!online}
            aria-label={t('race.open')}
            title={title}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/60 text-lg leading-none transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden>🎮</span>
          </button>
        </div>
      )}

      {open && online && (
        <Suspense fallback={null}>
          <RaceGameModal
            color={color}
            kind={kind}
            bodyText={bodyText}
            plate={plate}
            shared={sharedTab}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  )
}
