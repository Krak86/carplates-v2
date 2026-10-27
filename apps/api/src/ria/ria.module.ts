import { Module } from '@nestjs/common'

import { RiaController } from './ria.controller.js'
import { RiaService } from './ria.service.js'

@Module({
  controllers: [RiaController],
  providers: [RiaService]
})
export class RiaModule {}
