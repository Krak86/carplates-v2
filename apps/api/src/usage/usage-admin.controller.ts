import { Controller, Get, Header, Inject, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { adminAnalyticsResponseSchema, adminStatsResponseSchema } from '@carplates/shared'

import { AdminGuard } from '../auth/session.guard.js'

import { PosthogService } from './posthog.service.js'
import { UsageService } from './usage.service.js'

class AdminStatsDto extends createZodDto(adminStatsResponseSchema) {}
class AdminAnalyticsDto extends createZodDto(adminAnalyticsResponseSchema) {}

@ApiTags('admin')
@Controller('api/admin')
@UseGuards(AdminGuard)
export class UsageAdminController {
  constructor(
    @Inject(UsageService) private readonly usage: UsageService,
    @Inject(PosthogService) private readonly posthog: PosthogService
  ) {}

  @Get('stats')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AdminStatsDto })
  stats(): Promise<AdminStatsDto> {
    return this.usage.stats()
  }

  @Get('analytics')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AdminAnalyticsDto })
  analytics(): Promise<AdminAnalyticsDto> {
    return this.posthog.summary()
  }
}
