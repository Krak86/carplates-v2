import { Body, Controller, Get, Header, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common'
import { ApiAcceptedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { contactRequestSchema, contactStartRequestSchema } from '@carplates/shared'
import type { ContactRequest, ContactStartRequest } from '@carplates/shared'
import type { FastifyRequest } from 'fastify'

import { EmailStartDto } from '../auth/auth.dto.js'
import { SessionToken } from '../auth/session.guard.js'
import { CONTACT_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { ContactConfigDto } from './contact.dto.js'
import { ContactService } from './contact.service.js'

@ApiTags('contact')
@Controller('api/contact')
export class ContactController {
  constructor(@Inject(ContactService) private readonly contact: ContactService) {}

  @Get('config')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: ContactConfigDto })
  config(): ContactConfigDto {
    return this.contact.config
  }

  /** Anonymous senders, step 1: bot check (Turnstile), then a 6-digit code is mailed to the address. */
  @Post('start')
  @HttpCode(202)
  @UseGuards(ThrottlerGuard)
  @Throttle(CONTACT_THROTTLE)
  @ApiAcceptedResponse({ type: EmailStartDto })
  async start(
    @Body(zodParam(contactStartRequestSchema)) body: ContactStartRequest,
    @Req() req: FastifyRequest
  ): Promise<EmailStartDto> {
    return this.contact.start(body, req.ip, req.headers['user-agent'])
  }

  /** Mails the message to the owner's private inbox (Resend); Reply-To is the verified sender. */
  @Post()
  @HttpCode(202)
  @UseGuards(ThrottlerGuard)
  @Throttle(CONTACT_THROTTLE)
  @ApiAcceptedResponse({ description: 'Message accepted' })
  async send(
    @Body(zodParam(contactRequestSchema)) body: ContactRequest,
    @SessionToken() sessionToken: string | null
  ): Promise<void> {
    await this.contact.send(body, sessionToken)
  }
}
