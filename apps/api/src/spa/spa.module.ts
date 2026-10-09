import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'

import { PlateModule } from '../plate/plate.module.js'
import { RdwModule } from '../rdw/rdw.module.js'
import { VinModule } from '../vin/vin.module.js'
import { OgController } from './og.controller.js'
import { PreviewService } from './preview.service.js'
import { SpaController } from './spa.controller.js'

@Module({
  imports: [PlateModule, VinModule, RdwModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
  // OgController first: the SPA catch-all (`*`) must not shadow /og/*.
  controllers: [OgController, SpaController],
  providers: [PreviewService]
})
export class SpaModule {}
