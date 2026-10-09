import { Module } from '@nestjs/common'

import { EvModule } from '../ev/ev.module.js'
import { FxModule } from '../fx/fx.module.js'
import { Models360Module } from '../models360/models360.module.js'
import { Models3dModule } from '../models3d/models3d.module.js'
import { PlateModule } from '../plate/plate.module.js'
import { RdwModule } from '../rdw/rdw.module.js'
import { VdbModule } from '../vdb/vdb.module.js'
import { WikiModule } from '../wiki/wiki.module.js'
import { CardController } from './card.controller.js'
import { CardService } from './card.service.js'

@Module({
  imports: [PlateModule, VdbModule, RdwModule, EvModule, Models3dModule, Models360Module, WikiModule, FxModule],
  controllers: [CardController],
  providers: [CardService]
})
export class CardModule {}
