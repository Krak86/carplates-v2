import { Body, Controller, Get, Header, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common'
import { ApiAcceptedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { contactRequestSchema } from '@carplates/shared'
import type { ContactRequest } from '@carplates/shared'
import type { FastifyRequest } from 'fastify'

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

  /** Mails the message to the owner's private inbox (Resend); Reply-To is the sender. */
  @Post()
  @HttpCode(202)
  @UseGuards(ThrottlerGuard)
  @Throttle(CONTACT_THROTTLE)
  @ApiAcceptedResponse({ description: 'Message accepted' })
  async send(@Body(zodParam(contactRequestSchema)) body: ContactRequest, @Req() req: FastifyRequest): Promise<void> {
    await this.contact.send(body, req.ip)
  }
}
