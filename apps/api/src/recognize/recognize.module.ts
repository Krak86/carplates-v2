import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'

import { CloudRecognizeService } from './cloud-recognize.service.js'
import { RecognizeController } from './recognize.controller.js'

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 6 }])],
  controllers: [RecognizeController],
  providers: [CloudRecognizeService],
  exports: [CloudRecognizeService]
})
export class RecognizeModule {}
