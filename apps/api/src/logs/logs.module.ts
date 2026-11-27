import { Module } from '@nestjs/common'

import { LogsAdminController } from './logs-admin.controller.js'
import { LogsService } from './logs.service.js'

@Module({ controllers: [LogsAdminController], providers: [LogsService] })
export class LogsModule {}
