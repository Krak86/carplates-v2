import { Controller, Get, Header, Inject, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { adminAnalyticsResponseSchema, adminServerResponseSchema, adminStatsResponseSchema } from '@carplates/shared'

import { AdminGuard } from '../auth/session.guard.js'
import { MarketService } from '../market/market.service.js'

import { PosthogService } from './posthog.service.js'
import { ServerStatsService } from './server-stats.service.js'
import { UsageService } from './usage.service.js'

class AdminServerDto extends createZodDto(adminServerResponseSchema) {}
class AdminStatsDto extends createZodDto(adminStatsResponseSchema) {}
class AdminAnalyticsDto extends createZodDto(adminAnalyticsResponseSchema) {}

@ApiTags('admin')
@Controller('api/admin')
@UseGuards(AdminGuard)
export class UsageAdminController {
  constructor(
    @Inject(UsageService) private readonly usage: UsageService,
    @Inject(PosthogService) private readonly posthog: PosthogService,
    @Inject(ServerStatsService) private readonly serverStats: ServerStatsService,
    @Inject(MarketService) private readonly market: MarketService
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

  @Get('server')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AdminServerDto })
  async server(): Promise<AdminServerDto> {
    // A failing counter must never hide the host numbers.
    const [snapshot, market] = await Promise.all([this.serverStats.snapshot(), this.market.stats().catch(() => null)])
    return { ...snapshot, market }
  }
}
