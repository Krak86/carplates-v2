import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const env = vi.hoisted(() => ({ CONTACT_TO: 'owner@example.com' as string | undefined }))
vi.mock('../env.js', () => ({ loadEnv: () => env }))

import type { TurnstileService } from '../auth/turnstile.js'
import type { MailService } from '../mail/mail.service.js'

import { ContactService } from './contact.service.js'

const body = { email: 'a@b.co', topic: 'newApp', message: 'Hello there, I need an app.', lang: 'en' } as const

describe('ContactService', () => {
  const send = vi.fn().mockResolvedValue(undefined)
  const verify = vi.fn()
  let service: ContactService

  beforeEach(() => {
    send.mockClear()
    verify.mockReset().mockResolvedValue(true)
    env.CONTACT_TO = 'owner@example.com'
    service = new ContactService(
      { send } as unknown as MailService,
      {
        verify,
        siteKey: null
      } as unknown as TurnstileService
    )
  })

  it('mails the owner with the sender as Reply-To', async () => {
    await service.send(body, '1.2.3.4')
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@example.com', replyTo: 'a@b.co' }))
  })

  it('drops a filled honeypot silently', async () => {
    await service.send({ ...body, website: 'http://spam' }, '1.2.3.4')
    expect(send).not.toHaveBeenCalled()
  })

  it('rejects a failed challenge', async () => {
    verify.mockResolvedValue(false)
    await expect(service.send(body, '1.2.3.4')).rejects.toBeInstanceOf(ForbiddenException)
    expect(send).not.toHaveBeenCalled()
  })

  it('is disabled without CONTACT_TO', async () => {
    env.CONTACT_TO = undefined
    expect(service.config.enabled).toBe(false)
    await expect(service.send(body, '1.2.3.4')).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
