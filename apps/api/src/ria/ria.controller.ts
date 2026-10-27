import { Controller, Get, Inject, Param } from '@nestjs/common'
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'

import { PLATE_LOOKUP_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'
import { RiaCheckDto } from './ria.dto.js'
import { RiaService } from './ria.service.js'

@ApiTags('ria-check')
@Controller('api/ria-check')
export class RiaController {
  constructor(@Inject(RiaService) private readonly riaService: RiaService) {}

  @Get(':plate')
  @Throttle(PLATE_LOOKUP_THROTTLE)
  @ApiParam({ name: 'plate', example: 'АА8193НР' })
  @ApiOkResponse({ type: RiaCheckDto })
  check(@Param('plate', zodParam(z.string().min(1).max(20))) plate: string): Promise<RiaCheckDto> {
    return this.riaService.check(plate)
  }
}
