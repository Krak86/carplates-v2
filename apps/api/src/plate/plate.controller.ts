import { Controller, Get, Param } from '@nestjs/common'
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'
import { PlateHistoryDto, PlateLookupDto } from './plate.dto.js'
import { PlateService } from './plate.service.js'

const PlateParam = zodParam(z.string().min(1).max(20))

@ApiTags('plate')
@Controller('api/plate')
export class PlateController {
  constructor(private readonly plateService: PlateService) {}

  @Get(':plate')
  @ApiParam({ name: 'plate', example: 'ВЕ7116АА', description: 'Latin or Cyrillic; normalized server-side' })
  @ApiOkResponse({ type: PlateLookupDto })
  lookup(@Param('plate', PlateParam) plate: string): Promise<PlateLookupDto> {
    return this.plateService.lookup(plate)
  }

  @Get(':plate/history')
  @ApiParam({ name: 'plate', example: 'ВЕ7116АА' })
  @ApiOkResponse({ type: PlateHistoryDto })
  history(@Param('plate', PlateParam) plate: string): Promise<PlateHistoryDto> {
    return this.plateService.history(plate)
  }
}
