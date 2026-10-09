import { Module } from '@nestjs/common'

import { RdwController } from './rdw.controller.js'
import { RdwService } from './rdw.service.js'

@Module({
  controllers: [RdwController],
  providers: [RdwService],
  exports: [RdwService]
})
export class RdwModule {}
