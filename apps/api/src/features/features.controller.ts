import { Body, Controller, Get, Header, Inject, Put, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { featuresUpdateRequestSchema } from '@carplates/shared'
import type { FeaturesUpdateRequest, SessionUser } from '@carplates/shared'

import { CurrentUser, SessionGuard } from '../auth/session.guard.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { FeaturesDto } from './features.dto.js'
import { FeaturesService } from './features.service.js'

/** Paid-feature opt-ins of the signed-in user. No billing yet — an opt-in only unlocks the placeholder sections. */
@ApiTags('features')
@Controller('api/features')
@UseGuards(SessionGuard)
export class FeaturesController {
  constructor(@Inject(FeaturesService) private readonly featuresService: FeaturesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: FeaturesDto })
  async list(@CurrentUser() user: SessionUser): Promise<FeaturesDto> {
    return { features: await this.featuresService.list(user.id) }
  }

  @Put()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: FeaturesDto })
  async update(
    @CurrentUser() user: SessionUser,
    @Body(zodParam(featuresUpdateRequestSchema)) body: FeaturesUpdateRequest
  ): Promise<FeaturesDto> {
    return { features: await this.featuresService.update(user.id, body) }
  }
}
