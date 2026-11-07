import { Module } from '@nestjs/common'

import { LossesController } from './losses.controller.js'
import { LossesService } from './losses.service.js'

@Module({ controllers: [LossesController], providers: [LossesService], exports: [LossesService] })
export class LossesModule {}
