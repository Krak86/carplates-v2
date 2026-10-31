import { z } from 'zod'

import { UI_LANGS, emailAddressSchema } from './account.js'

/** What a contact-form message is about; shown in the mail subject. */
export const CONTACT_TOPICS = ['newApp', 'feedback', 'data', 'other'] as const
export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export const CONTACT_MESSAGE_MIN = 10
export const CONTACT_MESSAGE_MAX = 4000

/**
 * POST /api/contact: a message mailed to the site owner's private inbox (never shown on the site). Own file, not
 * `schemas.ts`, so adding it does not bust offline caches.
 */
export const contactRequestSchema = z.object({
  name: z.string().trim().max(100).optional(),
  /** Becomes the mail's Reply-To, so the owner answers the sender directly. */
  email: emailAddressSchema,
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(CONTACT_MESSAGE_MIN).max(CONTACT_MESSAGE_MAX),
  lang: z.enum(UI_LANGS).default('ua'),
  turnstileToken: z.string().max(4096).optional(),
  /** Honeypot: a hidden field real users leave empty; a filled one is a bot and is dropped silently. */
  website: z.string().max(500).optional()
})
export type ContactRequest = z.infer<typeof contactRequestSchema>

/** GET /api/contact/config: whether the form can send, and the Turnstile site key when a challenge is configured. */
export const contactConfigSchema = z.object({
  enabled: z.boolean(),
  turnstileSiteKey: z.string().nullable()
})
export type ContactConfig = z.infer<typeof contactConfigSchema>
