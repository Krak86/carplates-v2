import { Module } from '@nestjs/common'

import { EuroNcapService } from './euroncap.service.js'
import { SafetyController } from './safety.controller.js'
import { SafetyService } from './safety.service.js'
import { SafetyVideoService } from './safety-video.service.js'

@Module({
  controllers: [SafetyController],
  providers: [SafetyService, SafetyVideoService, EuroNcapService],
  exports: [SafetyService, EuroNcapService]
})
export class SafetyModule {}
