import { Module } from '@nestjs/common'

import { VinController } from './vin.controller.js'
import { VinService } from './vin.service.js'

@Module({
  controllers: [VinController],
  providers: [VinService],
  exports: [VinService]
})
export class VinModule {}
