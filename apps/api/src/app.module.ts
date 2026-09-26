import { Module } from '@nestjs/common'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'
import { SentryModule } from '@sentry/nestjs/setup'
import { ZodValidationPipe } from 'nestjs-zod'

import { AllExceptionsFilter } from './common/all-exceptions.filter.js'
import { DbModule } from './db/db.module.js'
import { HealthController } from './health/health.controller.js'
import { PhotosModule } from './photos/photos.module.js'
import { PlateModule } from './plate/plate.module.js'
import { RecognizeModule } from './recognize/recognize.module.js'
import { SafetyModule } from './safety/safety.module.js'
import { SpaModule } from './spa/spa.module.js'
import { StatsModule } from './stats/stats.module.js'
import { VinModule } from './vin/vin.module.js'
import { WikiModule } from './wiki/wiki.module.js'

@Module({
  imports: [
    SentryModule.forRoot(),
    DbModule,
    PlateModule,
    VinModule,
    RecognizeModule,
    StatsModule,
    PhotosModule,
    SafetyModule,
    WikiModule,
    SpaModule
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter }
  ]
})
export class AppModule {}
