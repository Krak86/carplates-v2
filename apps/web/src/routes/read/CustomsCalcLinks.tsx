import { CUSTOMS_PRESETS } from '@carplates/shared'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { presetHref } from '@/routes/customs/helpers'
import { CUSTOMS_PATH } from '@/routes/read/links'

/** The calculator link plus its three preset examples; shared by the imports and auctions guides. */
export default function CustomsCalcLinks(): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="space-y-2 text-sm">
      <Link to={CUSTOMS_PATH} className="font-medium text-primary">
        {t('read.cost.open')}
      </Link>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-muted">{t('read.cost.examples')}:</span>
        {CUSTOMS_PRESETS.map(preset => (
          <Link key={preset.id} to={presetHref(preset)} className="text-primary underline">
            {t(`customs.presets.${preset.id}`)}
          </Link>
        ))}
      </div>
    </div>
  )
}
