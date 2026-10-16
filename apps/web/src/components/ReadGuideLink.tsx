import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { cn } from '@/lib/cn'
import { GUIDE_META, type GuidePath } from '@/routes/read/links'

type Props = {
  guide: GuidePath
  /** Deep link into the guide (defaults to its top). */
  href?: string
  className?: string
}

/**
 * "📖 Guide: <title> →" pill at the foot of a card section: a cross-link to the /read guide that explains the same topic
 * across the whole registry. The right arrow marks a route of this app (↗ is external, ↓ / ↑ jump within the card).
 */
export default function ReadGuideLink({ guide, href = guide, className }: Props): ReactNode {
  const { t } = useTranslation()
  const { icon, titleKey, hue } = GUIDE_META[guide]
  const label = t('read.card.guide', { title: t(titleKey) })

  return (
    <p className={cn('mt-3', className)}>
      <Link
        to={href}
        viewTransition
        title={label}
        style={{ '--chip': `hsl(${hue} 80% 50%)` } as CSSProperties}
        className="group/guide inline-flex items-center gap-1.5 rounded-full border chip-tone py-1 pr-2.5 pl-2.5 text-xs font-medium text-fg transition-colors hover:border-primary"
      >
        <span aria-hidden>{icon}</span>
        {label}
        <svg
          viewBox="0 0 12 12"
          aria-hidden
          className="size-3 text-primary transition-transform group-hover/guide:translate-x-0.5"
        >
          <path
            d="M2 6h8M6.5 2.5 10 6l-3.5 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </p>
  )
}
