import { Controller, Get, Param } from '@nestjs/common'
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'
import { VinDecodeDto } from './vin.dto.js'
import { VinService } from './vin.service.js'

@ApiTags('vin')
@Controller('api/vin')
export class VinController {
  constructor(private readonly vinService: VinService) {}

  @Get(':vin')
  @ApiParam({ name: 'vin', example: '3VWD17AJ9GM299880' })
  @ApiOkResponse({ type: VinDecodeDto })
  decode(@Param('vin', zodParam(z.string().min(11).max(20))) vin: string): Promise<VinDecodeDto> {
    return this.vinService.decode(vin)
  }
}
