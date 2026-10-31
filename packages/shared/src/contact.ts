import { z } from 'zod'

import { EMAIL_CODE_LENGTH, UI_LANGS, emailAddressSchema } from './account.js'

/** What a contact-form message is about; shown in the mail subject. */
export const CONTACT_TOPICS = ['newApp', 'feedback', 'data', 'other'] as const
export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export const CONTACT_MESSAGE_MIN = 10
export const CONTACT_MESSAGE_MAX = 4000
/** One message per sender (account or verified address) in this window. */
export const CONTACT_COOLDOWN_MINUTES = 10
/** More links than this and the message is refused as spam. */
export const CONTACT_MAX_LINKS = 2

/** Counts `http(s)://` and `www.` links in a message. */
export function countLinks(text: string): number {
  return text.match(/https?:\/\/|www\./gi)?.length ?? 0
}

const contactFields = {
  name: z.string().trim().max(100).optional(),
  /** Becomes the mail's Reply-To, so the owner answers the sender directly. A signed-in user's own email overrides it. */
  email: emailAddressSchema,
  topic: z.enum(CONTACT_TOPICS),
  message: z
    .string()
    .trim()
    .min(CONTACT_MESSAGE_MIN)
    .max(CONTACT_MESSAGE_MAX)
    .refine(m => countLinks(m) <= CONTACT_MAX_LINKS, 'Too many links'),
  lang: z.enum(UI_LANGS).default('ua'),
  /** Honeypot: a hidden field real users leave empty; a filled one is a bot and is dropped silently. */
  website: z.string().max(500).optional()
}

/**
 * POST /api/contact: a message mailed to the site owner's private inbox (never shown on the site). Own file, not
 * `schemas.ts`, so adding it does not bust offline caches. A signed-in user (with an email) needs nothing more; an
 * anonymous sender first proves the address with the 6-digit code from `POST /api/contact/start`.
 */
export const contactRequestSchema = z.object({
  ...contactFields,
  challengeId: z.string().uuid().optional(),
  code: z
    .string()
    .regex(new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`))
    .optional()
})
export type ContactRequest = z.infer<typeof contactRequestSchema>

/** POST /api/contact/start (anonymous senders): bot check, then a code is mailed to `email`. Answers `emailStartResponseSchema`. */
export const contactStartRequestSchema = z.object({
  email: contactFields.email,
  lang: contactFields.lang,
  website: contactFields.website,
  turnstileToken: z.string().max(4096).optional()
})
export type ContactStartRequest = z.infer<typeof contactStartRequestSchema>

/** GET /api/contact/config: whether the form can send, and the Turnstile site key when a challenge is configured. */
export const contactConfigSchema = z.object({
  enabled: z.boolean(),
  turnstileSiteKey: z.string().nullable()
})
export type ContactConfig = z.infer<typeof contactConfigSchema>
