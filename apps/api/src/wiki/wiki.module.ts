import { Module } from '@nestjs/common'

import { GenerationsModule } from '../generations/generations.module.js'
import { WikiController } from './wiki.controller.js'
import { WikiCandidateStore } from './wiki-candidate.store.js'
import { WikiPaintStore } from './wiki-paint.store.js'
import { WikiPhotosController } from './wiki-photos.controller.js'
import { WikiPhotosService } from './wiki-photos.service.js'
import { WikiRecolorController } from './wiki-recolor.controller.js'
import { WikiRecolorService } from './wiki-recolor.service.js'
import { WikiImageStore } from './wiki-image.store.js'
import { WikiService } from './wiki.service.js'

@Module({
  imports: [GenerationsModule],
  controllers: [WikiController, WikiRecolorController, WikiPhotosController],
  providers: [WikiService, WikiImageStore, WikiPaintStore, WikiRecolorService, WikiCandidateStore, WikiPhotosService],
  exports: [WikiService]
})
export class WikiModule {}
