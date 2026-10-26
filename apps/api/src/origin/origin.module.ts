import { Module } from '@nestjs/common'

import { OriginController } from './origin.controller.js'
import { OriginService } from './origin.service.js'

@Module({
  controllers: [OriginController],
  providers: [OriginService]
})
export class OriginModule {}
