import { Module } from '@nestjs/common'

import { CaRecallsController } from './ca-recalls.controller.js'
import { CaRecallsService } from './ca-recalls.service.js'

@Module({
  controllers: [CaRecallsController],
  providers: [CaRecallsService]
})
export class CaRecallsModule {}
