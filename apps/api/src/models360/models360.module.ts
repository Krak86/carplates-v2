import { Module } from '@nestjs/common'

import { Models360Controller } from './models360.controller.js'
import { Models360Service } from './models360.service.js'

@Module({
  controllers: [Models360Controller],
  providers: [Models360Service],
  exports: [Models360Service]
})
export class Models360Module {}
