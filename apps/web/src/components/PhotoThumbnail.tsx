import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  url: string
  onClose: () => void
}

export default function PhotoThumbnail({ url, onClose }: Props): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="relative w-full max-w-xl">
      <img src={url} alt="" className="h-32 w-full rounded-lg object-cover" />
      <button
        type="button"
        onClick={onClose}
        aria-label={t('search.closePhoto')}
        className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
      >
        ✕
      </button>
    </div>
  )
}
