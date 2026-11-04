import { Module } from '@nestjs/common'

import { ShowroomController } from './showroom.controller.js'
import { ShowroomService } from './showroom.service.js'

@Module({
  controllers: [ShowroomController],
  providers: [ShowroomService]
})
export class ShowroomModule {}
