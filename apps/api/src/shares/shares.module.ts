import { Global, Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'

import { skipThrottle } from '../common/throttle.js'
import { loadEnv } from '../env.js'
import { RecognizeModule } from '../recognize/recognize.module.js'
import { AnonymizeService } from './anonymize.service.js'
import { createShareObjectStore } from './r2-object-store.js'
import { SharePrivacyHeadersGuard, ShareImageInterceptor, UserThrottlerGuard } from './share-http.js'
import { SharesCleanupService } from './shares-cleanup.service.js'
import { SharesController } from './shares.controller.js'
import { SharesRepository } from './shares.repository.js'
import { SharesService } from './shares.service.js'
import { SHARE_OBJECT_STORE } from './types.js'
import type { ShareObjectStore } from './types.js'

/**
 * Storage + cleanup, global so account deletion (`AuthService`, `AccountPurgeService`) can remove a user's shares
 * without importing the whole feature (which itself needs the auth guards).
 */
@Global()
@Module({
  providers: [
    { provide: SHARE_OBJECT_STORE, useFactory: (): ShareObjectStore => createShareObjectStore(loadEnv()) },
    SharesRepository,
    SharesCleanupService
  ],
  exports: [SHARE_OBJECT_STORE, SharesRepository, SharesCleanupService]
})
export class SharesStorageModule {}

@Module({
  imports: [
    RecognizeModule,
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }], skipIf: skipThrottle })
  ],
  controllers: [SharesController],
  providers: [AnonymizeService, SharesService, SharePrivacyHeadersGuard, ShareImageInterceptor, UserThrottlerGuard],
  exports: [SharesService]
})
export class SharesModule {}
