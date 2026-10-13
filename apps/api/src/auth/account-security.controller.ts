import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import {
  LINKABLE_PROVIDERS,
  emailVerifyRequestSchema,
  googleSignInRequestSchema,
  reauthEmailStartRequestSchema,
  setEmailStartRequestSchema,
  telegramSignInRequestSchema
} from '@carplates/shared'
import type {
  EmailVerifyRequest,
  GoogleSignInRequest,
  LinkableProvider,
  ReauthEmailStartRequest,
  SessionUser,
  SetEmailStartRequest,
  TelegramSignInRequest
} from '@carplates/shared'
import type { FastifyRequest } from 'fastify'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { AccountSecurityService } from './account-security.service.js'
import { EmailStartDto, SessionDto } from './auth.dto.js'
import { AuthService } from './auth.service.js'
import type { ResolvedSession } from './auth.service.js'
import { clientContext } from './client-context.js'
import { SessionCookieInterceptor, WithSessionCookie } from './session-cookie.interceptor.js'
import { CurrentSession, CurrentUser, SessionGuard, SudoGuard } from './session.guard.js'

const providerSchema = z.enum(LINKABLE_PROVIDERS)
const AUTH_THROTTLE = { default: { ttl: 15 * 60_000, limit: 30 } }

/** `/profile` endpoints: devices, re-authentication, change email, linked providers, account deletion. */
@ApiTags('auth')
@Controller('api/auth')
@UseInterceptors(SessionCookieInterceptor)
export class AccountSecurityController {
  constructor(
    @Inject(AccountSecurityService) private readonly security: AccountSecurityService,
    @Inject(AuthService) private readonly auth: AuthService
  ) {}

  @Get('methods')
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'no-store')
  methods(@CurrentUser() user: SessionUser): ReturnType<AccountSecurityService['methods']> {
    return this.security.methods(user.id)
  }

  @Get('sessions')
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'no-store')
  async sessions(
    @CurrentSession() session: ResolvedSession
  ): Promise<{ sessions: Awaited<ReturnType<AccountSecurityService['listSessions']>> }> {
    return { sessions: await this.security.listSessions(session.user.id, session.sessionId) }
  }

  @Delete('sessions/:id')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async revokeSession(
    @CurrentUser() user: SessionUser,
    @Param('id', new ParseUUIDPipe()) id: string
  ): Promise<{ ok: true }> {
    await this.security.revokeSession(user.id, id)
    return { ok: true }
  }

  @Post('sessions/revoke-others')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async revokeOthers(@CurrentSession() session: ResolvedSession): Promise<{ ok: true }> {
    await this.security.revokeOtherSessions(session.user.id, session.tokenHash)
    return { ok: true }
  }

  // ── Re-authentication ──────────────────────────────────────────────────────

  @Post('reauth/email/start')
  @HttpCode(202)
  @UseGuards(SessionGuard, ThrottlerGuard)
  @Throttle({ default: { ttl: 15 * 60_000, limit: 10 } })
  @ApiOkResponse({ type: EmailStartDto })
  reauthEmailStart(
    @CurrentUser() user: SessionUser,
    @Body(zodParam(reauthEmailStartRequestSchema)) body: ReauthEmailStartRequest,
    @Req() req: FastifyRequest
  ): Promise<EmailStartDto> {
    return this.security.startEmailReauth(user, body.lang, clientContext(req))
  }

  @Post('reauth/email/verify')
  @HttpCode(200)
  @UseGuards(SessionGuard, ThrottlerGuard)
  @Throttle({ default: AUTH_THROTTLE.default })
  reauthEmailVerify(
    @CurrentSession() session: ResolvedSession,
    @Body(zodParam(emailVerifyRequestSchema)) body: EmailVerifyRequest
  ): ReturnType<AccountSecurityService['completeEmailReauth']> {
    return this.security.completeEmailReauth(session, body.challengeId, body.code)
  }

  @Post('reauth/google')
  @HttpCode(200)
  @UseGuards(SessionGuard, ThrottlerGuard)
  @Throttle({ default: AUTH_THROTTLE.default })
  reauthGoogle(
    @CurrentSession() session: ResolvedSession,
    @Body(zodParam(googleSignInRequestSchema)) body: GoogleSignInRequest
  ): ReturnType<AccountSecurityService['reauthWithGoogle']> {
    return this.security.reauthWithGoogle(session, body.credential)
  }

  @Post('reauth/telegram')
  @HttpCode(200)
  @UseGuards(SessionGuard, ThrottlerGuard)
  @Throttle({ default: AUTH_THROTTLE.default })
  reauthTelegram(
    @CurrentSession() session: ResolvedSession,
    @Body(zodParam(telegramSignInRequestSchema)) body: TelegramSignInRequest
  ): ReturnType<AccountSecurityService['reauthWithTelegram']> {
    return this.security.reauthWithTelegram(session, body)
  }

  // ── Change / add email (sudo) ──────────────────────────────────────────────

  @Post('set-email/start')
  @HttpCode(202)
  @UseGuards(SudoGuard, ThrottlerGuard)
  @Throttle({ default: { ttl: 15 * 60_000, limit: 10 } })
  @ApiOkResponse({ type: EmailStartDto })
  setEmailStart(
    @CurrentUser() user: SessionUser,
    @Body(zodParam(setEmailStartRequestSchema)) body: SetEmailStartRequest,
    @Req() req: FastifyRequest
  ): Promise<EmailStartDto> {
    return this.security.startSetEmail(user, body.email, body.lang, clientContext(req))
  }

  @Post('set-email/verify')
  @HttpCode(200)
  @UseGuards(SudoGuard, ThrottlerGuard)
  @Throttle({ default: AUTH_THROTTLE.default })
  @ApiOkResponse({ type: SessionDto })
  async setEmailVerify(
    @CurrentSession() session: ResolvedSession,
    @Body(zodParam(emailVerifyRequestSchema)) body: EmailVerifyRequest,
    @Req() req: FastifyRequest
  ): Promise<WithSessionCookie<SessionDto>> {
    const { user, token, deviceId } = await this.security.completeSetEmail(
      session,
      body.challengeId,
      body.code,
      clientContext(req)
    )
    return new WithSessionCookie({ user }, token, deviceId)
  }

  // ── Linked providers (sudo) ────────────────────────────────────────────────

  @Post('link/google')
  @HttpCode(200)
  @UseGuards(SudoGuard, ThrottlerGuard)
  @Throttle({ default: AUTH_THROTTLE.default })
  async linkGoogle(
    @CurrentUser() user: SessionUser,
    @Body(zodParam(googleSignInRequestSchema)) body: GoogleSignInRequest
  ): Promise<{ ok: true }> {
    await this.security.linkGoogle(user.id, body.credential)
    return { ok: true }
  }

  @Post('link/telegram')
  @HttpCode(200)
  @UseGuards(SudoGuard, ThrottlerGuard)
  @Throttle({ default: AUTH_THROTTLE.default })
  async linkTelegram(
    @CurrentUser() user: SessionUser,
    @Body(zodParam(telegramSignInRequestSchema)) body: TelegramSignInRequest
  ): Promise<{ ok: true }> {
    await this.security.linkTelegram(user.id, body)
    return { ok: true }
  }

  @Delete('methods/:provider')
  @HttpCode(200)
  @UseGuards(SudoGuard)
  async unlink(
    @CurrentSession() session: ResolvedSession,
    @Param('provider', zodParam(providerSchema)) provider: LinkableProvider
  ): Promise<{ ok: true }> {
    await this.security.unlink(session.user.id, provider, session.tokenHash)
    return { ok: true }
  }

  // ── Deletion (sudo) ────────────────────────────────────────────────────────

  /** Schedules deletion (grace period) and signs out everywhere. Signing in again before the deadline restores the account. */
  @Delete('me')
  @HttpCode(200)
  @UseGuards(SudoGuard)
  @ApiOkResponse({ type: SessionDto })
  async deleteMe(@CurrentUser() user: SessionUser): Promise<WithSessionCookie<SessionDto>> {
    await this.auth.scheduleDeletion(user.id)
    return new WithSessionCookie({ user: null }, null)
  }
}
