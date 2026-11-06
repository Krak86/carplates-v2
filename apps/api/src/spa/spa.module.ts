import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'

import { AuctionsModule } from '../auctions/auctions.module.js'
import { CatalogModule } from '../catalog/catalog.module.js'
import { PlateModule } from '../plate/plate.module.js'
import { RdwModule } from '../rdw/rdw.module.js'
import { SharesModule } from '../shares/shares.module.js'
import { VinModule } from '../vin/vin.module.js'
import { WantedModule } from '../wanted/wanted.module.js'
import { ComparePreviewService } from './compare-preview.js'
import { OgController } from './og.controller.js'
import { PreviewService } from './preview.service.js'
import { SeoController } from './seo.controller.js'
import { SpaController } from './spa.controller.js'

@Module({
  imports: [
    AuctionsModule,
    CatalogModule,
    PlateModule,
    VinModule,
    RdwModule,
    SharesModule,
    WantedModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])
  ],
  // OgController first: the SPA catch-all (`*`) must not shadow /og/*.
  controllers: [OgController, SeoController, SpaController],
  providers: [PreviewService, ComparePreviewService]
})
export class SpaModule {}
