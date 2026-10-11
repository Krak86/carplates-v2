import { Module } from '@nestjs/common'

import { GenerationsModule } from '../generations/generations.module.js'

import { WikispecsController } from './wikispecs.controller.js'
import { WikispecsService } from './wikispecs.service.js'

@Module({
  imports: [GenerationsModule],
  controllers: [WikispecsController],
  providers: [WikispecsService],
  exports: [WikispecsService]
})
export class WikispecsModule {}
