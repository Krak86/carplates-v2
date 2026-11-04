import { Module } from '@nestjs/common'

import { CatalogModule } from '../catalog/catalog.module.js'

import { TuningController } from './tuning.controller.js'
import { TuningService } from './tuning.service.js'

@Module({
  imports: [CatalogModule],
  controllers: [TuningController],
  providers: [TuningService]
})
export class TuningModule {}
