import { Module } from '@nestjs/common'

import { WikiController } from './wiki.controller.js'
import { WikiPaintStore } from './wiki-paint.store.js'
import { WikiRecolorController } from './wiki-recolor.controller.js'
import { WikiRecolorService } from './wiki-recolor.service.js'
import { WikiImageStore } from './wiki-image.store.js'
import { WikiService } from './wiki.service.js'

@Module({
  controllers: [WikiController, WikiRecolorController],
  providers: [WikiService, WikiImageStore, WikiPaintStore, WikiRecolorService],
  exports: [WikiService]
})
export class WikiModule {}
