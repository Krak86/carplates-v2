import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ShareRemoved } from '@carplates/shared'

type Props = {
  /** Null / undefined for shares made before the server recorded it: only the always-true lines show. */
  removed: ShareRemoved | null | undefined
}

const px = (s: { width: number; height: number }): string => `${s.width}x${s.height}`

/** What the shared copy lost versus the uploaded photo (the plate and everything else in the picture stays visible). */
export default function ShareRemovedList({ removed }: Props): ReactNode {
  const { t } = useTranslation()
  const from = removed?.originalSize
  const to = removed?.storedSize
  const resized = !!from && !!to && (from.width !== to.width || from.height !== to.height)
  return (
    <ul className="list-disc space-y-0.5 pl-5">
      {removed && (
        <li>
          {removed.facesBlurred > 0
            ? t('photoShare.removed.faces', { count: removed.facesBlurred })
            : t('photoShare.removed.noFaces')}
        </li>
      )}
      <li>{t('photoShare.removed.metadata')}</li>
      <li>{t('photoShare.removed.filename')}</li>
      {resized && <li>{t('photoShare.removed.resized', { from: px(from), to: px(to) })}</li>}
    </ul>
  )
}
