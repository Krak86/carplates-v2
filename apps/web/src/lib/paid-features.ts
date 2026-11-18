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

/**
 * Planned work, ideas and research shown on /features ("What's next"); not toggleable. i18n: `paid.soon.<id>`,
 * chip `features.status.<status>`. Dropped for now (no plan / skipped / too early): plate alerts, window stickers,
 * own sale listings, AUTO.RIA ads and average price, Platesmania, foreign auction history.
 */
export const UPCOMING_FEATURES = [
  { id: 'ai_chat', icon: '🤖', status: 'planned' },
  { id: 'year_pages', icon: '📅', status: 'planned' },
  { id: 'wiki_photos', icon: '🖼️', status: 'planned' },
  { id: 'compare_extras', icon: '⚖️', status: 'planned' },
  { id: 'mileage_check', icon: '🛣️', status: 'idea' },
  { id: 'car_timeline', icon: '🕒', status: 'idea' },
  { id: 'co2_class', icon: '🌿', status: 'idea' },
  { id: 'trust_counters', icon: '🔢', status: 'idea' },
  { id: 'telegram_bot', icon: '✈️', status: 'idea' },
  { id: 'embed_widget', icon: '🧩', status: 'idea' },
  { id: 'race_extras', icon: '🏁', status: 'idea' },
  { id: 'depreciation', icon: '📉', status: 'research' },
  { id: 'per_capita', icon: '👥', status: 'research' }
] as const
