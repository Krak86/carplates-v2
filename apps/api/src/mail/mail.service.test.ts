import { describe, expect, it, vi } from 'vitest'

import type { MailQueueService } from './mail-queue.service.js'
import { MailQueueService as RealQueue, maskEmail } from './mail-queue.service.js'
import { MailService } from './mail.service.js'

const mail = { to: 'a@b.co', subject: 's', html: '<p>x</p>', text: 'x' }

const fakeQueue = (enqueue: () => Promise<boolean>) =>
  ({ enqueue: vi.fn(enqueue), startWorker: vi.fn() }) as unknown as MailQueueService & {
    enqueue: ReturnType<typeof vi.fn>
  }

describe('MailService queue routing', () => {
  it('does not transmit directly when the mail was queued', async () => {
    const queue = fakeQueue(async () => true)
    const service = new MailService(queue)
    const transmit = vi.spyOn(service as unknown as { transmit: () => Promise<void> }, 'transmit')
    await service.send(mail, 'code', 'code-1')
    expect(queue.enqueue).toHaveBeenCalledWith(mail, 'code', 'code-1')
    expect(transmit).not.toHaveBeenCalled()
  })

  it('falls back to a direct send when enqueueing fails (Redis down)', async () => {
    const service = new MailService(fakeQueue(async () => false))
    const transmit = vi
      .spyOn(service as unknown as { transmit: () => Promise<void> }, 'transmit')
      .mockResolvedValue(undefined)
    await service.send(mail, 'code')
    expect(transmit).toHaveBeenCalledTimes(1)
  })

  it('sends kind-less mail (digest) directly without touching the queue', async () => {
    const queue = fakeQueue(async () => true)
    const service = new MailService(queue)
    vi.spyOn(service as unknown as { transmit: () => Promise<void> }, 'transmit').mockResolvedValue(undefined)
    await service.send(mail)
    expect(queue.enqueue).not.toHaveBeenCalled()
  })
})

describe('MailQueueService without Redis', () => {
  it('is disabled: enqueue returns false, status is empty', async () => {
    const queue = new RealQueue()
    expect(queue.enabled).toBe(false)
    expect(await queue.enqueue(mail, 'code')).toBe(false)
    expect((await queue.status()).enabled).toBe(false)
  })

  it('masks recipients', () => {
    expect(maskEmail('alice@example.com')).toBe('a***@example.com')
  })
})
