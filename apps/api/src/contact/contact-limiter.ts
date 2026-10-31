import { HttpException, HttpStatus } from '@nestjs/common'
import { CONTACT_COOLDOWN_MINUTES } from '@carplates/shared'

const COOLDOWN_MS = CONTACT_COOLDOWN_MINUTES * 60_000

/**
 * One contact message per sender per cooldown window. In memory on purpose: nothing about a message is stored, and the
 * worst a restart or a second (blue/green) instance can do is allow one extra message. The per-IP throttle and the
 * per-address code limits (`email-challenge.ts`, in the DB) still apply on top.
 */
export class ContactLimiter {
  private readonly sentAt = new Map<string, number>()

  /** Throws 429 while `key` is still cooling down. */
  assertAllowed(key: string, now = Date.now()): void {
    this.prune(now)
    const last = this.sentAt.get(key)
    if (last === undefined || now - last >= COOLDOWN_MS) return
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Please wait before sending another message',
        retryAfterSeconds: Math.ceil((COOLDOWN_MS - (now - last)) / 1000)
      },
      HttpStatus.TOO_MANY_REQUESTS
    )
  }

  record(key: string, now = Date.now()): void {
    this.sentAt.set(key, now)
  }

  private prune(now: number): void {
    for (const [key, at] of this.sentAt) if (now - at >= COOLDOWN_MS) this.sentAt.delete(key)
  }
}
