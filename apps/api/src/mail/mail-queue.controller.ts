import { Controller, Get, Header, Inject, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { mailQueueStatusSchema } from '@carplates/shared'

import { AdminGuard } from '../auth/session.guard.js'

import { MailQueueService } from './mail-queue.service.js'

class MailQueueStatusDto extends createZodDto(mailQueueStatusSchema) {}

/** Admin view of the mail queue: counts and the latest failed jobs (recipient masked). */
@ApiTags('admin')
@Controller('api/admin/mail-queue')
@UseGuards(AdminGuard)
export class MailQueueController {
  constructor(@Inject(MailQueueService) private readonly queue: MailQueueService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: MailQueueStatusDto })
  status(): Promise<MailQueueStatusDto> {
    return this.queue.status()
  }
}
