import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import Card from '@/components/ui/Card'
import { SHOWROOM_GAME_URL } from '@/routes/showroom/helpers'

/** Link-out to the NFSU2 browser port. It cannot be embedded (`X-Frame-Options: DENY`, `frame-ancestors 'none'`). */
export default function ShowroomGame(): ReactNode {
  const { t } = useTranslation()
  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="space-y-1">
        <h2 className="flex flex-wrap items-center gap-2 font-semibold">
          <span aria-hidden>🏁</span>
          {t('showroom.game.title')}
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {t('showroom.game.badge')}
          </span>
        </h2>
        <p className="text-sm text-muted">{t('showroom.game.desc')}</p>
      </div>
      <a
        href={SHOWROOM_GAME_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-full border border-primary px-4 py-1.5 text-center text-sm font-medium text-primary hover:bg-primary hover:text-white"
      >
        {t('showroom.game.button')}
      </a>
    </Card>
  )
}
