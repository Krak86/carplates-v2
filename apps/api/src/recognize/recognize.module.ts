import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'

import { CloudRecognizeService } from './cloud-recognize.service.js'
import { LocalRecognizeService } from './local-recognize.service.js'
import { VinRecognizeService } from './vin-recognize.service.js'
import { RegistryRankService } from './registry-rank.service.js'
import { RecognizeController } from './recognize.controller.js'

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 6 }])],
  controllers: [RecognizeController],
  providers: [CloudRecognizeService, LocalRecognizeService, RegistryRankService, VinRecognizeService],
  exports: [CloudRecognizeService, LocalRecognizeService]
})
export class RecognizeModule {}
