import { Module } from '@nestjs/common'

import { CncapService } from './cncap.service.js'
import { EuroNcapService } from './euroncap.service.js'
import { JncapService } from './jncap.service.js'
import { SafetyController } from './safety.controller.js'
import { SafetyService } from './safety.service.js'
import { SafetyVideoService } from './safety-video.service.js'

@Module({
  controllers: [SafetyController],
  providers: [SafetyService, SafetyVideoService, EuroNcapService, JncapService, CncapService],
  exports: [SafetyService, EuroNcapService, JncapService, CncapService]
})
export class SafetyModule {}
