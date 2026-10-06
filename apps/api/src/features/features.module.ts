import { Module } from '@nestjs/common'

import { AdminController } from './admin.controller.js'
import { FeaturesController } from './features.controller.js'
import { FeaturesService } from './features.service.js'

@Module({
  controllers: [FeaturesController, AdminController],
  providers: [FeaturesService]
})
export class FeaturesModule {}
