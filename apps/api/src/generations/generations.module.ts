import { Module } from '@nestjs/common'

import { GenerationsController } from './generations.controller.js'
import { GenerationsService } from './generations.service.js'

@Module({
  controllers: [GenerationsController],
  providers: [GenerationsService]
})
export class GenerationsModule {}
