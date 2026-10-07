import { Body, Controller, Get, Header, Inject, Put, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { settingsUpdateRequestSchema } from '@carplates/shared'
import type { SessionUser, SettingsResponse, SettingsUpdateRequest } from '@carplates/shared'

import { CurrentUser, SessionGuard } from '../auth/session.guard.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { SettingsDto } from './settings.dto.js'
import { SettingsService } from './settings.service.js'

/** The signed-in user's preferences document (default layer, background presets, ...). */
@ApiTags('settings')
@Controller('api/settings')
@UseGuards(SessionGuard)
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: SettingsDto })
  get(@CurrentUser() user: SessionUser): Promise<SettingsResponse> {
    return this.settingsService.get(user.id)
  }

  /** Saves the document if it is newer than the stored one; either way returns whichever document is now current. */
  @Put()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: SettingsDto })
  put(
    @CurrentUser() user: SessionUser,
    @Body(zodParam(settingsUpdateRequestSchema)) body: SettingsUpdateRequest
  ): Promise<SettingsResponse> {
    return this.settingsService.put(user.id, body)
  }
}
