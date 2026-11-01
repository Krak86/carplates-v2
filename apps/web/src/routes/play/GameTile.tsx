import type { CSSProperties, ReactNode } from 'react'

type Props = {
  emoji: string
  hue: number
  title: string
  desc: string
  /** Small line under the description, e.g. the best score. */
  note?: string
}

/** Library-style poster: portrait gradient cover with a big emoji, the title and a one-line note below. */
export default function GameTile({ emoji, hue, title, desc, note }: Props): ReactNode {
  return (
    <div className="group flex h-full flex-col gap-2 text-left">
      <div
        className="game-cover relative flex items-center justify-center overflow-hidden rounded-lg border border-border shadow-sm transition duration-300 ease-out group-hover:-translate-y-1 group-hover:border-primary group-hover:shadow-lg group-focus-visible:outline-2"
        style={{ '--hue': hue } as CSSProperties}
      >
        <span aria-hidden className="text-7xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
          {emoji}
        </span>

        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-lg leading-tight font-bold text-white">
          {title}
        </span>
      </div>

      <div className="min-w-0 px-0.5">
        <p className="font-semibold">{title}</p>
        <p className="line-clamp-2 text-sm text-muted">{desc}</p>
        {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      </div>
    </div>
  )
}
