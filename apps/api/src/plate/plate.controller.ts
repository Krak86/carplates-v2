import { Controller, Get, Inject, Param } from '@nestjs/common'
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'

import { PLATE_LOOKUP_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'
import { PlateHistoryDto, PlateLookupDto } from './plate.dto.js'
import { PlateService } from './plate.service.js'

const PlateParam = zodParam(z.string().min(1).max(20))

@ApiTags('plate')
@Controller('api/plate')
export class PlateController {
  constructor(@Inject(PlateService) private readonly plateService: PlateService) {}

  @Get(':plate')
  @Throttle(PLATE_LOOKUP_THROTTLE)
  @ApiParam({ name: 'plate', example: 'ВЕ7116АА', description: 'Latin or Cyrillic; normalized server-side' })
  @ApiOkResponse({ type: PlateLookupDto })
  lookup(@Param('plate', PlateParam) plate: string): Promise<PlateLookupDto> {
    return this.plateService.lookup(plate)
  }

  @Get(':plate/history')
  @Throttle(PLATE_LOOKUP_THROTTLE)
  @ApiParam({ name: 'plate', example: 'ВЕ7116АА' })
  @ApiOkResponse({ type: PlateHistoryDto })
  history(@Param('plate', PlateParam) plate: string): Promise<PlateHistoryDto> {
    return this.plateService.history(plate)
  }
}
