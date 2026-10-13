import { Body, Controller, Get, Header, HttpCode, Inject, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler'
import {
  emailLinkVerifyRequestSchema,
  emailStartRequestSchema,
  emailVerifyRequestSchema,
  googleSignInRequestSchema,
  telegramSignInRequestSchema
} from '@carplates/shared'
import type {
  EmailLinkVerifyRequest,
  EmailStartRequest,
  EmailVerifyRequest,
  GoogleSignInRequest,
  TelegramSignInRequest
} from '@carplates/shared'
import type { FastifyRequest } from 'fastify'

import { zodParam } from '../common/zod-param.pipe.js'

import { AuthConfigDto, EmailStartDto, SessionDto } from './auth.dto.js'
import { AuthService } from './auth.service.js'
import { clientContext } from './client-context.js'
import { SessionCookieInterceptor, WithSessionCookie } from './session-cookie.interceptor.js'
import { SessionToken } from './session.guard.js'

@ApiTags('auth')
@Controller('api/auth')
@UseInterceptors(SessionCookieInterceptor)
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  /** Public config the sign-in button needs (the Google client id is not a secret). */
  @Get('config')
  @Header('Cache-Control', 'public, max-age=300')
  @ApiOkResponse({ type: AuthConfigDto })
  config(): AuthConfigDto {
    return {
      googleClientId: this.authService.googleClientId,
      telegramBotUsername: this.authService.telegramBotUsername,
      emailEnabled: true,
      turnstileSiteKey: this.authService.turnstileSiteKey,
      deletionGraceDays: this.authService.deletionGraceDays
    }
  }

  /** The current user, or `user: null` when anonymous / the session expired. */
  @Get('me')
  @SkipThrottle({ short: true, medium: true, long: true })
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: SessionDto })
  async me(@SessionToken() token: string | null): Promise<SessionDto> {
    return { user: token ? await this.authService.userForToken(token) : null }
  }

  /** Exchanges a Google Identity Services ID token for our own session cookie. */
  @Post('google')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 15 * 60_000, limit: 20 } })
  @ApiOkResponse({ type: SessionDto })
  async google(
    @Body(zodParam(googleSignInRequestSchema)) body: GoogleSignInRequest,
    @Req() req: FastifyRequest
  ): Promise<WithSessionCookie<SessionDto>> {
    const { user, token, deviceId } = await this.authService.signInWithGoogle(body.credential, clientContext(req))
    return new WithSessionCookie({ user }, token, deviceId)
  }

  /** Exchanges a signed Telegram Login Widget payload for our own session cookie. */
  @Post('telegram')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 15 * 60_000, limit: 20 } })
  @ApiOkResponse({ type: SessionDto })
  async telegram(
    @Body(zodParam(telegramSignInRequestSchema)) body: TelegramSignInRequest,
    @Req() req: FastifyRequest
  ): Promise<WithSessionCookie<SessionDto>> {
    const { user, token, deviceId } = await this.authService.signInWithTelegram(body, clientContext(req))
    return new WithSessionCookie({ user }, token, deviceId)
  }

  /** Step 1: mails a 6-digit code + magic link. Always 202 with the same shape, whether or not the address has an account. */
  @Post('email/start')
  @HttpCode(202)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 15 * 60_000, limit: 10 } })
  @ApiOkResponse({ type: EmailStartDto })
  async emailStart(
    @Body(zodParam(emailStartRequestSchema)) body: EmailStartRequest,
    @Req() req: FastifyRequest
  ): Promise<EmailStartDto> {
    return this.authService.startEmailSignIn(body, req.ip, clientContext(req))
  }

  /** Step 2a: the code typed on the site. */
  @Post('email/verify')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 15 * 60_000, limit: 30 } })
  @ApiOkResponse({ type: SessionDto })
  async emailVerify(
    @Body(zodParam(emailVerifyRequestSchema)) body: EmailVerifyRequest,
    @Req() req: FastifyRequest
  ): Promise<WithSessionCookie<SessionDto>> {
    const { user, token, deviceId } = await this.authService.signInWithEmailCode(
      body.challengeId,
      body.code,
      clientContext(req)
    )
    return new WithSessionCookie({ user }, token, deviceId)
  }

  /** Step 2b: the magic-link token (POSTed by the /auth/email page after an explicit click — never on GET). */
  @Post('email/verify-link')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 15 * 60_000, limit: 30 } })
  @ApiOkResponse({ type: SessionDto })
  async emailVerifyLink(
    @Body(zodParam(emailLinkVerifyRequestSchema)) body: EmailLinkVerifyRequest,
    @Req() req: FastifyRequest
  ): Promise<WithSessionCookie<SessionDto>> {
    const { user, token, deviceId } = await this.authService.signInWithEmailLink(body.token, clientContext(req))
    return new WithSessionCookie({ user }, token, deviceId)
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOkResponse({ type: SessionDto })
  async logout(@SessionToken() token: string | null): Promise<WithSessionCookie<SessionDto>> {
    if (token) await this.authService.signOut(token)
    return new WithSessionCookie({ user: null }, null)
  }
}
