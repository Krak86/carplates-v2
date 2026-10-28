import { Module } from '@nestjs/common'

import { DigestAdminController, DigestController } from './digest.controller.js'
import { DigestService } from './digest.service.js'

@Module({
  controllers: [DigestController, DigestAdminController],
  providers: [DigestService]
})
export class DigestModule {}
