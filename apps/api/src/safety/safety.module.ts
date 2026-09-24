import { Module } from '@nestjs/common'

import { SafetyController } from './safety.controller.js'
import { SafetyService } from './safety.service.js'
import { SafetyVideoService } from './safety-video.service.js'

@Module({
  controllers: [SafetyController],
  providers: [SafetyService, SafetyVideoService],
  exports: [SafetyService]
})
export class SafetyModule {}
