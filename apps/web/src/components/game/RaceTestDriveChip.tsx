import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useOnlineStatus } from '@/hooks/useOnlineStatus'

type Props = {
  onOpen: () => void
}

/** "Test drive" chip in the card's chip row: the way into the racer on phones, where the side banner is hidden. */
export default function RaceTestDriveChip({ onOpen }: Props): ReactNode {
  const { t } = useTranslation()
  const online = useOnlineStatus()

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!online}
      title={online ? t('race.open') : t('offline.needsConnection')}
      className="inline-flex animate-chip-in cursor-pointer items-center gap-1 rounded-full border chip-tone px-2 py-0.5 text-xs text-[var(--color-fg)] transition-colors chip-view hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-fg)]"
    >
      <span aria-hidden>🏁</span>
      {t('race.chip')}
    </button>
  )
}
