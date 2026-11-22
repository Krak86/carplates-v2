import { z } from 'zod'

/** Why a mail is sent; shown in the admin queue view and logs (never the recipient's content). */
export const MAIL_KINDS = ['code', 'notice', 'contact'] as const
export type MailKind = (typeof MAIL_KINDS)[number]

/** Queue names as one list so producer, worker and admin view cannot drift. */
export const QUEUE_NAMES = ['mail'] as const
export type QueueName = (typeof QUEUE_NAMES)[number]

/**
 * The `mail.send` message: an already rendered mail plus routing metadata. Same contract for every transport
 * (BullMQ now, RabbitMQ later). `idempotencyKey` becomes the job id, so a duplicate enqueue is a no-op.
 */
export const mailSendSchema = z.object({
  kind: z.enum(MAIL_KINDS),
  idempotencyKey: z.string().min(1).max(200),
  to: z.string().min(3).max(320),
  subject: z.string().min(1).max(998),
  html: z.string(),
  text: z.string(),
  from: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  replyTo: z.string().optional()
})
export type MailSend = z.infer<typeof mailSendSchema>

/** Admin view of the mail queue: counts plus the latest failures with the recipient masked. */
export const mailQueueStatusSchema = z.object({
  enabled: z.boolean(),
  counts: z.object({
    waiting: z.number(),
    active: z.number(),
    delayed: z.number(),
    failed: z.number(),
    completed: z.number()
  }),
  failed: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(MAIL_KINDS),
      to: z.string(),
      attempts: z.number(),
      reason: z.string(),
      failedAt: z.string().nullable()
    })
  )
})
export type MailQueueStatus = z.infer<typeof mailQueueStatusSchema>
