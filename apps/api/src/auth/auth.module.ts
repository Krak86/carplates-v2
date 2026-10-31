import { Global, Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'

import { AccountPurgeService } from './account-purge.service.js'
import { AccountSecurityController } from './account-security.controller.js'
import { AccountSecurityService } from './account-security.service.js'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { EmailChallengeService } from './email-challenge.service.js'
import { SessionCookieInterceptor } from './session-cookie.interceptor.js'
import { AdminGuard, SessionGuard, SudoGuard } from './session.guard.js'
import { TurnstileService } from './turnstile.js'

/** Global so any feature module can put SessionGuard / AdminGuard on its routes. */
@Global()
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }])],
  controllers: [AuthController, AccountSecurityController],
  providers: [
    AuthService,
    AccountSecurityService,
    AccountPurgeService,
    EmailChallengeService,
    TurnstileService,
    SessionGuard,
    SudoGuard,
    AdminGuard,
    SessionCookieInterceptor
  ],
  exports: [AuthService, SessionGuard, SudoGuard, AdminGuard, TurnstileService]
})
export class AuthModule {}
