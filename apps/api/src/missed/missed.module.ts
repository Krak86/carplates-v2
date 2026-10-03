import { Global, Module } from '@nestjs/common'

import { MissedService } from './missed.service.js'

@Global()
@Module({
  providers: [MissedService],
  exports: [MissedService]
})
export class MissedModule {}
