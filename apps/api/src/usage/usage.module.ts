import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'

import { MarketModule } from '../market/market.module.js'
import { CloudflareService } from './cloudflare.service.js'
import { PosthogService } from './posthog.service.js'
import { ServerStatsService } from './server-stats.service.js'
import { UsageAdminController } from './usage-admin.controller.js'
import { UsageInterceptor } from './usage.interceptor.js'
import { UsageService } from './usage.service.js'

@Module({
  imports: [MarketModule],
  controllers: [UsageAdminController],
  providers: [
    UsageService,
    PosthogService,
    CloudflareService,
    ServerStatsService,
    { provide: APP_INTERCEPTOR, useClass: UsageInterceptor }
  ]
})
export class UsageModule {}
