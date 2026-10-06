import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { googleSignInRequestSchema } from '@carplates/shared'
import type { GoogleSignInRequest, SessionUser } from '@carplates/shared'
import type { FastifyRequest } from 'fastify'

import { zodParam } from '../common/zod-param.pipe.js'

import { AuthConfigDto, SessionDto } from './auth.dto.js'
import { AuthService } from './auth.service.js'
import { SessionCookieInterceptor, WithSessionCookie } from './session-cookie.interceptor.js'
import { CurrentUser, SessionGuard, SessionToken } from './session.guard.js'

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
    return { googleClientId: this.authService.googleClientId }
  }

  /** The current user, or `user: null` when anonymous / the session expired. */
  @Get('me')
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
    const { user, token } = await this.authService.signInWithGoogle(body.credential, req.headers['user-agent'])
    return new WithSessionCookie({ user }, token)
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOkResponse({ type: SessionDto })
  async logout(@SessionToken() token: string | null): Promise<WithSessionCookie<SessionDto>> {
    if (token) await this.authService.signOut(token)
    return new WithSessionCookie({ user: null }, null)
  }

  /** Permanently deletes the signed-in account and everything stored for it. */
  @Delete('me')
  @UseGuards(SessionGuard)
  @ApiOkResponse({ type: SessionDto })
  async deleteMe(@CurrentUser() user: SessionUser): Promise<WithSessionCookie<SessionDto>> {
    await this.authService.deleteAccount(user.id)
    return new WithSessionCookie({ user: null }, null)
  }
}
