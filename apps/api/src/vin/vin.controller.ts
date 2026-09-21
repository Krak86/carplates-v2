import { Controller, Get, Inject, Param } from '@nestjs/common'
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'
import { VinDecodeDto } from './vin.dto.js'
import { VinService } from './vin.service.js'

@ApiTags('vin')
@Controller('api/vin')
export class VinController {
  constructor(@Inject(VinService) private readonly vinService: VinService) {}

  @Get(':vin')
  @ApiParam({ name: 'vin', example: 'KNDPMCAC7H7153233' })
  @ApiOkResponse({ type: VinDecodeDto })
  decode(@Param('vin', zodParam(z.string().min(11).max(20))) vin: string): Promise<VinDecodeDto> {
    return this.vinService.decode(vin)
  }
}
