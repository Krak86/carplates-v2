import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Toggle = { on: boolean; onToggle: () => void }

type Props = {
  sound: Toggle
  tilt: Toggle
  auto: Toggle
  map: Toggle
  onRestart: () => void
  onExit: () => void
}

type ButtonProps = { icon: string; label: string; pressed?: boolean; onClick: () => void }

function BarButton({ icon, label, pressed, onClick }: ButtonProps): ReactNode {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onClick={e => {
        e.currentTarget.blur() // keys must keep steering the car
        onClick()
      }}
      className={`size-9 shrink-0 cursor-pointer rounded-full border border-white/30 text-lg leading-none text-white select-none ${pressed ? 'bg-[var(--color-primary)]' : 'bg-black/50'}`}
    >
      <span aria-hidden>{icon}</span>
    </button>
  )
}

/** The main switches of the immersive (full screen) mode in one row at the top: sound, tilt steering, auto drive, map, restart, exit. */
export default function RaceFullscreenBar({ sound, tilt, auto, map, onRestart, onExit }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="absolute top-3 left-1/2 flex -translate-x-1/2 gap-1.5">
      <BarButton
        icon={sound.on ? '🔊' : '🔇'}
        label={t('race.bar.sound')}
        pressed={sound.on}
        onClick={sound.onToggle}
      />
      <BarButton icon="📱" label={t('race.bar.tilt')} pressed={tilt.on} onClick={tilt.onToggle} />
      <BarButton icon="🏎" label={t('race.bar.auto')} pressed={auto.on} onClick={auto.onToggle} />
      <BarButton icon="🗺" label={t('race.bar.map')} pressed={map.on} onClick={map.onToggle} />
      <BarButton icon="↺" label={t('race.restart')} onClick={onRestart} />
      <BarButton icon="✕" label={t('race.touch.exitFullscreen')} onClick={onExit} />
    </div>
  )
}
