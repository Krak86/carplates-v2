import { Module } from '@nestjs/common'

import { Models3dController } from './models3d.controller.js'
import { Models3dService } from './models3d.service.js'

@Module({
  controllers: [Models3dController],
  providers: [Models3dService]
})
export class Models3dModule {}
