import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  StreamableFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common'
import { ApiConsumes, ApiTags } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { CreateShareResponse, MySharesResponse, SessionUser, ShareMetaResponse } from '@carplates/shared'
import type { FastifyRequest } from 'fastify'
import { z } from 'zod'

import { CurrentUser, SessionGuard } from '../auth/session.guard.js'
import { zodParam } from '../common/zod-param.pipe.js'
import { readUpload } from '../recognize/read-upload.js'
import { SharePrivacyHeadersGuard, ShareImageInterceptor, ShareImageResult, UserThrottlerGuard } from './share-http.js'
import { SharesService } from './shares.service.js'

/** Creating is the expensive, abusable call: 10/h per user (`default`, tracked by `UserThrottlerGuard`) and 30/h per IP (`long`, the global guard). */
const CREATE_THROTTLE = { default: { limit: 10, ttl: 3_600_000 }, long: { limit: 30, ttl: 3_600_000 } }
/** Link lookups: the token is unguessable, this only bounds a scraper. */
const VIEW_THROTTLE = { default: { limit: 60, ttl: 60_000 } }

/**
 * Shareable photo-search links. Owner routes need a session; the two token routes are public capability URLs and stay
 * out of the offline cache, `PUBLIC_API_PATH_PREFIXES` and the sitemap.
 */
@ApiTags('shares')
@Controller('api/shares')
export class SharesController {
  constructor(@Inject(SharesService) private readonly shares: SharesService) {}

  @Post()
  @UseGuards(SessionGuard, UserThrottlerGuard)
  @Throttle(CREATE_THROTTLE)
  @Header('Cache-Control', 'no-store')
  @ApiConsumes('multipart/form-data')
  async create(@CurrentUser() user: SessionUser, @Req() req: FastifyRequest): Promise<CreateShareResponse> {
    return this.shares.create(user.id, await readUpload(req))
  }

  @Get()
  @UseGuards(SessionGuard)
  @Header('Cache-Control', 'no-store')
  listMine(@CurrentUser() user: SessionUser): Promise<MySharesResponse> {
    return this.shares.listMine(user.id)
  }

  @Delete(':id')
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async remove(@CurrentUser() user: SessionUser, @Param('id', zodParam(z.uuid())) id: string): Promise<void> {
    await this.shares.remove(user.id, id)
  }

  @Get(':token')
  @UseGuards(SharePrivacyHeadersGuard, ThrottlerGuard)
  @Throttle(VIEW_THROTTLE)
  @Header('Cache-Control', 'no-store')
  describe(@Param('token') token: string): Promise<ShareMetaResponse> {
    return this.shares.describe(token)
  }

  @Get(':token/image')
  @UseGuards(SharePrivacyHeadersGuard, ThrottlerGuard)
  @UseInterceptors(ShareImageInterceptor)
  @Throttle(VIEW_THROTTLE)
  async image(@Param('token') token: string): Promise<ShareImageResult> {
    const { stream, length, maxAgeS } = await this.shares.image(token)
    return new ShareImageResult(new StreamableFile(stream, { type: 'image/jpeg', ...(length && { length }) }), maxAgeS)
  }
}
