import { Body, Controller, Header, HttpCode, Inject, Post, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { syncRequestSchema } from '@carplates/shared'
import type { SessionUser, SyncRequest, SyncResponse } from '@carplates/shared'

import { CurrentUser, SessionGuard } from '../auth/session.guard.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { SyncResponseDto } from './sync.dto.js'
import { SyncService } from './sync.service.js'

/** Cross-device sync of the signed-in user's favorites + history: push local changes, get the merged state back. */
@ApiTags('sync')
@Controller('api/sync')
@UseGuards(SessionGuard)
export class SyncController {
  constructor(@Inject(SyncService) private readonly syncService: SyncService) {}

  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: SyncResponseDto })
  sync(@CurrentUser() user: SessionUser, @Body(zodParam(syncRequestSchema)) body: SyncRequest): Promise<SyncResponse> {
    return this.syncService.sync(user.id, body)
  }
}
