import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionUser } from '@carplates/shared'

const env = vi.hoisted(() => ({
  CONTACT_TO: 'owner@example.com' as string | undefined,
  MAIL_REPLY_TO: undefined as string | undefined
}))
vi.mock('../env.js', () => ({ loadEnv: () => env }))

import type { AuthService } from '../auth/auth.service.js'
import type { EmailChallengeService } from '../auth/email-challenge.service.js'
import type { TurnstileService } from '../auth/turnstile.js'
import type { MailService } from '../mail/mail.service.js'

import { ContactService } from './contact.service.js'

const CHALLENGE_ID = '11111111-1111-4111-8111-111111111111'
const body = { email: 'a@b.co', topic: 'newApp', message: 'Hello there, I need an app.', lang: 'en' } as const
const withCode = { ...body, challengeId: CHALLENGE_ID, code: '123456' }
const user = { id: 'u1', email: 'member@example.com' } as SessionUser

describe('ContactService', () => {
  const send = vi.fn().mockResolvedValue(undefined)
  const verify = vi.fn()
  const start = vi.fn()
  const verifyCode = vi.fn()
  const userForToken = vi.fn()
  let service: ContactService

  beforeEach(() => {
    send.mockClear()
    verify.mockReset().mockResolvedValue(true)
    start.mockReset().mockResolvedValue({ challengeId: CHALLENGE_ID, expiresAt: 'x', resendAfterSeconds: 60 })
    verifyCode.mockReset().mockResolvedValue({ email: 'a@b.co' })
    userForToken.mockReset().mockResolvedValue(null)
    env.CONTACT_TO = 'owner@example.com'
    env.MAIL_REPLY_TO = undefined
    service = new ContactService(
      { send } as unknown as MailService,
      { verify, siteKey: null } as unknown as TurnstileService,
      { start, verifyCode } as unknown as EmailChallengeService,
      { userForToken } as unknown as AuthService
    )
  })

  describe('start (anonymous)', () => {
    it('checks the bot challenge, then mails a contact code', async () => {
      await service.start({ email: 'a@b.co', lang: 'en', turnstileToken: 't' }, '1.2.3.4', 'ua')
      expect(verify).toHaveBeenCalledWith('t', '1.2.3.4')
      expect(start).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.co', purpose: 'contact' }))
    })

    it('rejects a failed challenge without mailing a code', async () => {
      verify.mockResolvedValue(false)
      await expect(service.start({ email: 'a@b.co', lang: 'en' }, '1.2.3.4', 'ua')).rejects.toBeInstanceOf(
        ForbiddenException
      )
      expect(start).not.toHaveBeenCalled()
    })

    it('answers a honeypot like a real start but mails nothing', async () => {
      const res = await service.start({ email: 'a@b.co', lang: 'en', website: 'http://spam' }, '1.2.3.4', 'ua')
      expect(res.challengeId).toBeTruthy()
      expect(start).not.toHaveBeenCalled()
    })
  })

  describe('send', () => {
    it('mails the owner with the code-verified sender as Reply-To', async () => {
      await service.send(withCode, null)
      expect(verifyCode).toHaveBeenCalledWith(CHALLENGE_ID, '123456', 'contact')
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@example.com', replyTo: 'a@b.co' }))
    })

    it('needs a code from an anonymous sender', async () => {
      await expect(service.send(body, null)).rejects.toBeInstanceOf(BadRequestException)
      expect(send).not.toHaveBeenCalled()
    })

    it('rejects a code that was mailed to another address', async () => {
      verifyCode.mockResolvedValue({ email: 'other@b.co' })
      await expect(service.send(withCode, null)).rejects.toBeInstanceOf(UnauthorizedException)
      expect(send).not.toHaveBeenCalled()
    })

    it('trusts a signed-in user and uses their account email, not the typed one', async () => {
      userForToken.mockResolvedValue(user)
      await service.send(body, 'token')
      expect(verifyCode).not.toHaveBeenCalled()
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ replyTo: 'member@example.com' }))
    })

    it('allows one message per sender per cooldown, then answers 429', async () => {
      await service.send(withCode, null)
      await expect(service.send(withCode, null)).rejects.toBeInstanceOf(HttpException)
      expect(send).toHaveBeenCalledTimes(1)
      expect(verifyCode).toHaveBeenCalledTimes(1)
    })

    it('limits a signed-in user per account', async () => {
      userForToken.mockResolvedValue(user)
      await service.send(body, 'token')
      await expect(service.send({ ...body, email: 'x@y.zz' }, 'token')).rejects.toBeInstanceOf(HttpException)
    })

    it('answers 502 when the mail provider fails, and does not start the cooldown', async () => {
      send.mockRejectedValueOnce(new Error('Mail provider error 403'))
      await expect(service.send(withCode, null)).rejects.toBeInstanceOf(BadGatewayException)
      await service.send(withCode, null)
      expect(send).toHaveBeenCalledTimes(2)
    })

    it('drops a filled honeypot silently', async () => {
      await service.send({ ...withCode, website: 'http://spam' }, null)
      expect(send).not.toHaveBeenCalled()
      expect(verifyCode).not.toHaveBeenCalled()
    })
  })

  describe('recipient', () => {
    it('falls back to MAIL_REPLY_TO', async () => {
      env.CONTACT_TO = undefined
      env.MAIL_REPLY_TO = 'support@example.com'
      await service.send(withCode, null)
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'support@example.com' }))
    })

    it('is disabled when neither is set', async () => {
      env.CONTACT_TO = undefined
      expect(service.config.enabled).toBe(false)
      await expect(service.send(withCode, null)).rejects.toBeInstanceOf(ServiceUnavailableException)
    })
  })
})
