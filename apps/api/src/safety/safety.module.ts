import { Module } from '@nestjs/common'

import { CncapService } from './cncap.service.js'
import { EuroNcapService } from './euroncap.service.js'
import { JncapService } from './jncap.service.js'
import { KncapService } from './kncap.service.js'
import { SafetyController } from './safety.controller.js'
import { SafetyService } from './safety.service.js'
import { SafetyVideoService } from './safety-video.service.js'

@Module({
  controllers: [SafetyController],
  providers: [SafetyService, SafetyVideoService, EuroNcapService, JncapService, CncapService, KncapService],
  exports: [SafetyService, EuroNcapService, JncapService, CncapService, KncapService]
})
export class SafetyModule {}
