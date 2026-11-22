import { randomUUID } from 'node:crypto'

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import type { OnApplicationShutdown } from '@nestjs/common'
import { Queue, Worker } from 'bullmq'
import type { Job } from 'bullmq'
import { Redis } from 'ioredis'
import { mailSendSchema } from '@carplates/shared'
import type { MailKind, MailQueueStatus, MailSend } from '@carplates/shared'

import { loadEnv } from '../env.js'

/** BullMQ key prefix: keys are `mq:mail:*`, never the throttler's `thr:`. */
export const MAIL_QUEUE_PREFIX = 'mq'
const QUEUE_NAME = 'mail'
const ENQUEUE_TIMEOUT_MS = 2_000
const ATTEMPTS = 5
const BACKOFF_MS = 5_000
const COMPLETED_KEEP_S = 3_600
/** Failed jobs hold the rendered mail (recipient, code), so they are not kept long. */
const FAILED_KEEP_S = 7 * 24 * 3_600
const FAILED_KEEP_COUNT = 1_000
const FAILED_LIST_LIMIT = 20

export type MailHandler = (mail: Omit<MailSend, 'kind' | 'idempotencyKey'>) => Promise<void>

export const maskEmail = (email: string): string => {
  const [local = '', domain = ''] = email.split('@')
  return `${local.slice(0, 1)}***@${domain}`
}

/**
 * BullMQ mail queue on the shared Redis (`REDIS_URL`, noeviction + AOF), with its own ioredis connections (a Worker needs
 * `maxRetriesPerRequest: null`, which the throttler client deliberately does not use). Off unless `MAIL_QUEUE` is set and
 * `REDIS_URL` exists (dev, tests). The worker runs inside the API process: BullMQ job locks keep the blue/green overlap
 * from double-sending. `enqueue` returns false when Redis is unreachable so the caller sends directly (no mail is lost).
 */
@Injectable()
export class MailQueueService implements OnApplicationShutdown {
  private readonly logger = new Logger(MailQueueService.name)
  private readonly env = loadEnv()
  private queue: Queue<MailSend> | null = null
  private worker: Worker<MailSend> | null = null
  private connections: Redis[] = []
  private lastWarnAt = 0

  get enabled(): boolean {
    return this.env.MAIL_QUEUE && !!this.env.REDIS_URL
  }

  /** Starts the worker (once). `handler` is the direct transport send. */
  startWorker(handler: MailHandler): void {
    if (!this.enabled || this.worker) return
    this.worker = new Worker<MailSend>(
      QUEUE_NAME,
      async (job: Job<MailSend>) => {
        const { kind: _kind, idempotencyKey: _key, ...mail } = mailSendSchema.parse(job.data)
        await handler(mail)
      },
      { connection: this.connect('worker', null), prefix: MAIL_QUEUE_PREFIX, concurrency: 3 }
    )
    this.worker.on('failed', (job, err) => {
      const final = job && job.attemptsMade >= (job.opts.attempts ?? 1)
      this.logger[final ? 'error' : 'warn'](
        `Mail job ${job?.id ?? '?'} (${job?.data.kind ?? '?'}) attempt ${job?.attemptsMade ?? '?'}/${ATTEMPTS} failed${final ? ', giving up' : ''}: ${err.message}`
      )
    })
    this.worker.on('error', err => this.warn(err))
  }

  /** True when the mail is queued (or already was); false means the caller must send it directly. */
  async enqueue(
    mail: Omit<MailSend, 'kind' | 'idempotencyKey'>,
    kind: MailKind,
    idempotencyKey?: string
  ): Promise<boolean> {
    if (!this.enabled) return false
    const data: MailSend = { ...mail, kind, idempotencyKey: idempotencyKey ?? `${kind}-${randomUUID()}` }
    try {
      await this.withTimeout(
        this.getQueue().add('send', data, {
          jobId: data.idempotencyKey,
          attempts: ATTEMPTS,
          backoff: { type: 'exponential', delay: BACKOFF_MS },
          removeOnComplete: { age: COMPLETED_KEEP_S },
          removeOnFail: { age: FAILED_KEEP_S, count: FAILED_KEEP_COUNT }
        })
      )
      return true
    } catch (err) {
      this.warn(err)
      return false
    }
  }

  async status(): Promise<MailQueueStatus> {
    const empty = { waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 }
    if (!this.enabled) return { enabled: false, counts: empty, failed: [] }
    const queue = this.getQueue()
    // Redis down: a clear 503 for the admin view instead of a 500 (sending itself falls back to a direct send).
    const [counts, failed] = await this.withTimeout(
      Promise.all([
        queue.getJobCounts('waiting', 'active', 'delayed', 'failed', 'completed'),
        queue.getFailed(0, FAILED_LIST_LIMIT - 1)
      ])
    ).catch(() => {
      throw new ServiceUnavailableException('Mail queue unavailable (Redis is not reachable)')
    })
    return {
      enabled: true,
      counts: { ...empty, ...counts },
      failed: failed.map(job => ({
        id: String(job.id),
        kind: job.data.kind,
        to: maskEmail(job.data.to),
        attempts: job.attemptsMade,
        reason: (job.failedReason ?? '').slice(0, 300),
        failedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
      }))
    }
  }

  async onApplicationShutdown(): Promise<void> {
    // Waits for the in-flight send (stop_grace_period is 30s), then releases both connections.
    await this.worker?.close().catch(() => undefined)
    await this.queue?.close().catch(() => undefined)
    await Promise.all(this.connections.map(c => c.quit().catch(() => undefined)))
  }

  private getQueue(): Queue<MailSend> {
    this.queue ??= new Queue<MailSend>(QUEUE_NAME, {
      connection: this.connect('producer', 1),
      prefix: MAIL_QUEUE_PREFIX
    })
    return this.queue
  }

  private connect(role: string, maxRetriesPerRequest: number | null): Redis {
    const redis = new Redis(this.env.REDIS_URL ?? '', {
      connectionName: `carsua-api-mail-${role}`,
      maxRetriesPerRequest,
      connectTimeout: 2_000,
      retryStrategy: (attempt: number): number => Math.min(attempt * 200, 5_000)
    })
    // ioredis emits `error` on every failed reconnect; unhandled it would crash the process.
    redis.on('error', err => this.warn(err))
    this.connections.push(redis)
    return redis
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('mail queue enqueue timed out')), ENQUEUE_TIMEOUT_MS).unref()
      )
    ])
  }

  private warn(error: unknown, now = Date.now()): void {
    if (now - this.lastWarnAt < 60_000) return
    this.lastWarnAt = now
    this.logger.warn(`Mail queue: ${error instanceof Error ? error.message : String(error)}`)
  }
}
