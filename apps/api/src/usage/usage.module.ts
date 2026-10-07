import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'

import { PosthogService } from './posthog.service.js'
import { UsageAdminController } from './usage-admin.controller.js'
import { UsageInterceptor } from './usage.interceptor.js'
import { UsageService } from './usage.service.js'

@Module({
  controllers: [UsageAdminController],
  providers: [UsageService, PosthogService, { provide: APP_INTERCEPTOR, useClass: UsageInterceptor }]
})
export class UsageModule {}
