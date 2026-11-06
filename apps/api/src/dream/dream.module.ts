import { Module } from '@nestjs/common'

import { DreamController } from './dream.controller.js'
import { DreamService } from './dream.service.js'

@Module({ controllers: [DreamController], providers: [DreamService] })
export class DreamModule {}
