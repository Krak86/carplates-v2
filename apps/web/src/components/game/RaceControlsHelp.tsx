import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Row = { icon: string; label: string; key?: string }

type Props = {
  /** Whether the car has a siren (emergency vehicles only). */
  siren: boolean
}

/** A legend over the road in full screen: what each on-screen button does and its keyboard key. */
export default function RaceControlsHelp({ siren }: Props): ReactNode {
  const { t } = useTranslation()
  const rows: Row[] = [
    { icon: '🔊', label: t('race.bar.sound'), key: 'M' },
    { icon: '📱', label: t('race.bar.tilt') },
    { icon: '🏎', label: t('race.help.drive'), key: 'C' },
    { icon: '🗺', label: t('race.bar.map'), key: 'N' },
    { icon: '👁', label: t('race.view'), key: 'V' },
    { icon: '↺', label: t('race.restartHint'), key: 'R' },
    { icon: '📯', label: t('race.help.horn'), key: 'H' },
    ...(siren ? [{ icon: '🚨', label: t('race.siren'), key: 'E' }] : []),
    { icon: '✕', label: t('race.touch.exitFullscreen'), key: 'F' },
    { icon: '?', label: t('race.help.toggle'), key: 'I' }
  ]

  return (
    <div
      role="note"
      className="pointer-events-none absolute top-16 left-1/2 w-[min(92%,24rem)] -translate-x-1/2 rounded-lg bg-black/75 p-3 text-sm text-white"
    >
      <div className="mb-1 font-semibold">{t('race.help.title')}</div>
      <ul className="space-y-0.5">
        {rows.map(row => (
          <li key={row.icon} className="flex items-center gap-2">
            <span aria-hidden className="w-6 text-center">
              {row.icon}
            </span>
            <span className="min-w-0 flex-1">{row.label}</span>
            {row.key && <kbd className="rounded border border-white/40 px-1.5 font-mono text-xs">{row.key}</kbd>}
          </li>
        ))}
      </ul>
    </div>
  )
}
