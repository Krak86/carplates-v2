import { Module } from '@nestjs/common'

import { MotController } from './mot.controller.js'
import { MotService } from './mot.service.js'

@Module({
  controllers: [MotController],
  providers: [MotService],
  exports: [MotService]
})
export class MotModule {}
