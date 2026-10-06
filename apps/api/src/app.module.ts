import { Module } from '@nestjs/common'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'
import { SentryModule } from '@sentry/nestjs/setup'
import { ZodValidationPipe } from 'nestjs-zod'

import { AuthModule } from './auth/auth.module.js'
import { AllExceptionsFilter } from './common/all-exceptions.filter.js'
import { DbModule } from './db/db.module.js'
import { MissedModule } from './missed/missed.module.js'
import { FeaturesModule } from './features/features.module.js'
import { FuelModule } from './fuel/fuel.module.js'
import { HealthController } from './health/health.controller.js'
import { PhotosModule } from './photos/photos.module.js'
import { PlateModule } from './plate/plate.module.js'
import { RecognizeModule } from './recognize/recognize.module.js'
import { Models3dModule } from './models3d/models3d.module.js'
import { Models360Module } from './models360/models360.module.js'
import { NewsModule } from './news/news.module.js'
import { StocksModule } from './stocks/stocks.module.js'
import { SocialModule } from './social/social.module.js'
import { ReviewsModule } from './reviews/reviews.module.js'
import { SafetyModule } from './safety/safety.module.js'
import { SearchModule } from './search/search.module.js'
import { SpaModule } from './spa/spa.module.js'
import { StatsModule } from './stats/stats.module.js'
import { VinModule } from './vin/vin.module.js'
import { WikiModule } from './wiki/wiki.module.js'

@Module({
  imports: [
    SentryModule.forRoot(),
    DbModule,
    MissedModule,
    AuthModule,
    FeaturesModule,
    PlateModule,
    VinModule,
    RecognizeModule,
    NewsModule,
    SocialModule,
    StocksModule,
    ReviewsModule,
    Models3dModule,
    Models360Module,
    StatsModule,
    PhotosModule,
    SafetyModule,
    FuelModule,
    SearchModule,
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
