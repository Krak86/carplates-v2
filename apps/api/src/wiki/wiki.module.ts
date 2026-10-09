import { Module } from '@nestjs/common'

import { WikiController } from './wiki.controller.js'
import { WikiImageStore } from './wiki-image.store.js'
import { WikiService } from './wiki.service.js'

@Module({
  controllers: [WikiController],
  providers: [WikiService, WikiImageStore],
  exports: [WikiService]
})
export class WikiModule {}
