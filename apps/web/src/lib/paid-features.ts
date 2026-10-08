import type { PaidFeature } from '@carplates/shared'

/** Emoji per paid feature (titles/descriptions are i18n: `paid.<id>.title|desc|placeholder`). */
export const PAID_FEATURE_ICON: Record<PaidFeature, string> = {
  ria_ads: '🚘',
  ria_avg_price: '💵',
  platesmania: '📸',
  auction_history: '🇺🇸'
}

/**
 * Opt-in features that are live (toggle on /features, section on result cards). None yet: they're all listed as
 * "coming soon" / "under consideration" until implemented, and no paid wording is shown on the site.
 */
export const AVAILABLE_PAID_FEATURES: readonly PaidFeature[] = []

/** Planned account features shown as "coming soon" on /features — not toggleable yet. i18n: `paid.soon.<id>`. */
export const COMING_SOON_FEATURES = ['email_login'] as const

/** Ideas not yet decided on — listed last on /features under "under consideration". i18n: `paid.soon.<id>`. */
export const CONSIDERING_FEATURES = [
  'ria_ads',
  'ria_avg_price',
  'platesmania',
  'auction_history',
  'plate_alerts',
  'full_report',
  'auction_photos'
] as const

export type FutureFeature = (typeof COMING_SOON_FEATURES)[number] | (typeof CONSIDERING_FEATURES)[number]

export const FUTURE_FEATURE_ICON: Record<FutureFeature, string> = {
  ria_ads: PAID_FEATURE_ICON.ria_ads,
  email_login: '✉️',
  plate_alerts: '🔔',
  full_report: '📄',
  auction_photos: '🖼️',
  ria_avg_price: PAID_FEATURE_ICON.ria_avg_price,
  platesmania: PAID_FEATURE_ICON.platesmania,
  auction_history: PAID_FEATURE_ICON.auction_history
}
