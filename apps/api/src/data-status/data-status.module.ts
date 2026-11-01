import { Module } from '@nestjs/common'

import { DataStatusController } from './data-status.controller.js'
import { DataStatusService } from './data-status.service.js'

@Module({
  controllers: [DataStatusController],
  providers: [DataStatusService]
})
export class DataStatusModule {}
