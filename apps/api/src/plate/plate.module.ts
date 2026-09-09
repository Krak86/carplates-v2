import { Module } from '@nestjs/common'

import { PlateController } from './plate.controller.js'
import { PlateService } from './plate.service.js'

@Module({
  controllers: [PlateController],
  providers: [PlateService],
  exports: [PlateService]
})
export class PlateModule {}
