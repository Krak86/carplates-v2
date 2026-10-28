import { Body, Controller, Get, Header, HttpCode, Inject, Post, Put, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { marketingPreferenceRequestSchema, unsubscribeRequestSchema } from '@carplates/shared'
import type { MarketingPreferenceRequest, SessionResponse, SessionUser, UnsubscribeRequest } from '@carplates/shared'

import { AdminGuard, CurrentUser, SessionGuard } from '../auth/session.guard.js'
import { UNSUBSCRIBE_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'
import { authSecret, loadEnv } from '../env.js'

import { DigestService } from './digest.service.js'
import type { DigestStatus } from './digest.service.js'
import { verifyUnsubscribeToken } from './unsubscribe-token.js'

/** Monthly digest preference (signed-in) and the token-based unsubscribe (mail link and RFC 8058 one-click). */
@ApiTags('digest')
@Controller('api/digest')
export class DigestController {
  constructor(@Inject(DigestService) private readonly digest: DigestService) {}

  /** The /profile switch. Opting in is always an explicit click: nothing turns it on at sign-in. */
  @Put('subscription')
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'no-store')
  async setSubscription(
    @CurrentUser() user: SessionUser,
    @Body(zodParam(marketingPreferenceRequestSchema)) body: MarketingPreferenceRequest
  ): Promise<SessionResponse> {
    await this.digest.setSubscription(user.id, body.optIn)
    return { user: { ...user, marketingOptIn: body.optIn } }
  }

  /** The unsubscribe page's button. Always 200, so a forged token cannot tell whether an account exists. */
  @Post('unsubscribe')
  @HttpCode(200)
  @Throttle(UNSUBSCRIBE_THROTTLE)
  async unsubscribe(@Body(zodParam(unsubscribeRequestSchema)) body: UnsubscribeRequest): Promise<{ ok: true }> {
    await this.apply(body.token)
    return { ok: true }
  }

  /** RFC 8058 target of the `List-Unsubscribe` header: the mailbox provider POSTs here without a browser or cookies. */
  @Post('unsubscribe/one-click')
  @HttpCode(200)
  @Throttle(UNSUBSCRIBE_THROTTLE)
  async oneClick(@Query('t') token: string | undefined): Promise<{ ok: true }> {
    if (token) await this.apply(token)
    return { ok: true }
  }

  private async apply(token: string): Promise<void> {
    const userId = verifyUnsubscribeToken(authSecret(loadEnv()), token)
    if (userId) await this.digest.setSubscription(userId, false)
  }
}

/** Admin view of the next digest and a "send me a test" button. */
@ApiTags('admin')
@Controller('api/admin/digest')
@UseGuards(AdminGuard)
export class DigestAdminController {
  constructor(@Inject(DigestService) private readonly digest: DigestService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  status(): Promise<DigestStatus> {
    return this.digest.status()
  }

  @Post('test')
  @HttpCode(200)
  test(@CurrentUser() admin: SessionUser): Promise<{ sentTo: string | null }> {
    return this.digest.sendTest(admin)
  }
}
