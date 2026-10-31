import { Module } from '@nestjs/common'

import { RoadSafetyController } from './road-safety.controller.js'
import { RoadSafetyService } from './road-safety.service.js'

@Module({
  controllers: [RoadSafetyController],
  providers: [RoadSafetyService]
})
export class RoadSafetyModule {}
