import { Global, Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'

import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { SessionCookieInterceptor } from './session-cookie.interceptor.js'
import { AdminGuard, SessionGuard } from './session.guard.js'

/** Global so any feature module can put SessionGuard / AdminGuard on its routes. */
@Global()
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }])],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard, AdminGuard, SessionCookieInterceptor],
  exports: [AuthService, SessionGuard, AdminGuard]
})
export class AuthModule {}
