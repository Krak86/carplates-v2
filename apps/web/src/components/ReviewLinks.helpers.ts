import type { ReviewSiteId } from '@carplates/shared'

/** Proper-noun display names for the outbound review-site links — not translated. */
export const REVIEW_SITE_LABEL: Readonly<Record<ReviewSiteId, string>> = {
  'infocar-test-drive': 'Infocar · тест-драйви',
  'infocar-reviews': 'Infocar · відгуки власників',
  'auto-blog': 'Auto-Blog',
  drive2: 'DRIVE2'
}
