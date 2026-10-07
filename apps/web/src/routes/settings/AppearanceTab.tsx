import type { ReactNode } from 'react'

import BackgroundPresetsSection from '@/routes/settings/BackgroundPresetsSection'
import DefaultLayoutSection from '@/routes/settings/DefaultLayoutSection'

export default function AppearanceTab(): ReactNode {
  return (
    <>
      <DefaultLayoutSection />
      <BackgroundPresetsSection />
    </>
  )
}
