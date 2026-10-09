import { Module } from '@nestjs/common'

import { EvController } from './ev.controller.js'
import { EvService } from './ev.service.js'

@Module({
  controllers: [EvController],
  providers: [EvService],
  exports: [EvService]
})
export class EvModule {}
