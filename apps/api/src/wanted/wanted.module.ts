import { Module } from '@nestjs/common'

import { WantedController } from './wanted.controller.js'
import { WantedService } from './wanted.service.js'

@Module({
  controllers: [WantedController],
  providers: [WantedService]
})
export class WantedModule {}
