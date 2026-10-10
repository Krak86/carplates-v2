import { Module } from '@nestjs/common'

import { NhtsaController } from './nhtsa.controller.js'
import { NhtsaService } from './nhtsa.service.js'

@Module({
  controllers: [NhtsaController],
  providers: [NhtsaService]
})
export class NhtsaModule {}
