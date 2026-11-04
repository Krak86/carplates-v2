import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import ExternalGameModal from '@/routes/play/ExternalGameModal'
import GameTile from '@/routes/play/GameTile'
import { EXTERNAL_GAMES } from '@/routes/play/games'
import type { ExternalGame } from '@/routes/play/games'

/** The hub's "Play elsewhere" section: embeddable games open in a modal, the rest in a new tab (tile shows ↗). */
export default function ExternalGames(): ReactNode {
  const { t } = useTranslation()
  const [open, setOpen] = useState<ExternalGame | null>(null)

  return (
    <section className="mt-8" aria-labelledby="play-external">
      <h2 id="play-external" className="text-xl font-semibold">
        {t('play.external.title')}
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted">{t('play.external.intro')}</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {EXTERNAL_GAMES.map(game => {
          const title = t(`play.external.${game.id}.title`)
          const tile = (
            <GameTile
              external={!game.embed}
              emoji={game.emoji}
              hue={game.hue}
              title={title}
              desc={t(`play.external.${game.id}.desc`)}
              note={t(`play.external.${game.id}.note`)}
            />
          )
          return (
            <li key={game.id}>
              {game.embed ? (
                <button type="button" onClick={() => setOpen(game)} className="block h-full w-full cursor-pointer">
                  {tile}
                </button>
              ) : (
                <a
                  href={game.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${title} (${t('play.external.newTab')})`}
                  className="block h-full"
                >
                  {tile}
                </a>
              )}
            </li>
          )
        })}
      </ul>
      {open && <ExternalGameModal game={open} onClose={() => setOpen(null)} />}
    </section>
  )
}
