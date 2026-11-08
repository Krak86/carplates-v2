import { Module } from '@nestjs/common'

import { CspController } from './csp.controller.js'
import { CspService } from './csp.service.js'

@Module({
  controllers: [CspController],
  providers: [CspService]
})
export class CspModule {}
