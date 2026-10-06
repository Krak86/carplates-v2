import type { PaidFeature } from '@carplates/shared'

/** Emoji per paid feature (titles/descriptions are i18n: `paid.<id>.title|desc|placeholder`). */
export const PAID_FEATURE_ICON: Record<PaidFeature, string> = {
  ria_ads: '🚘',
  ria_avg_price: '💵',
  platesmania: '📸',
  auction_history: '🇺🇸'
}

/**
 * Paid features that are live (toggle on /features, section on result cards). The rest of `PAID_FEATURES` need paid
 * API keys, so they're listed under "under consideration" until then — see `CONSIDERING_FEATURES`.
 */
export const AVAILABLE_PAID_FEATURES: readonly PaidFeature[] = ['ria_ads']

/** Planned account features shown as "coming soon" on /features — not toggleable yet. i18n: `paid.soon.<id>`. */
export const COMING_SOON_FEATURES = ['cloud_sync', 'email_login', 'background_settings', 'favorite_labels'] as const

/** Ideas not yet decided on — listed last on /features under "under consideration". i18n: `paid.soon.<id>`. */
export const CONSIDERING_FEATURES = [
  'ria_avg_price',
  'platesmania',
  'auction_history',
  'plate_alerts',
  'full_report',
  'auction_photos'
] as const

export type FutureFeature = (typeof COMING_SOON_FEATURES)[number] | (typeof CONSIDERING_FEATURES)[number]

export const FUTURE_FEATURE_ICON: Record<FutureFeature, string> = {
  cloud_sync: '☁️',
  email_login: '✉️',
  background_settings: '🎨',
  favorite_labels: '🏷️',
  plate_alerts: '🔔',
  full_report: '📄',
  auction_photos: '🖼️',
  ria_avg_price: PAID_FEATURE_ICON.ria_avg_price,
  platesmania: PAID_FEATURE_ICON.platesmania,
  auction_history: PAID_FEATURE_ICON.auction_history
}
