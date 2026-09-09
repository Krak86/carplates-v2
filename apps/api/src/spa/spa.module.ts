import { Module } from '@nestjs/common'

import { PlateModule } from '../plate/plate.module.js'
import { VinModule } from '../vin/vin.module.js'
import { SpaController } from './spa.controller.js'

@Module({
  imports: [PlateModule, VinModule],
  controllers: [SpaController]
})
export class SpaModule {}
