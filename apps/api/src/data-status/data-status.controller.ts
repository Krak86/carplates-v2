import { Controller, Get, Header, Inject } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { ROLLUP_CACHE } from '../common/cache.js'
import { DataStatusResponseDto } from './data-status.dto.js'
import { DataStatusService } from './data-status.service.js'

/** What the registry data covers and when each scheduled job last ran. Not in `PUBLIC_API_PATH_PREFIXES`: it describes our own pipeline. */
@ApiTags('data-status')
@Controller('api/data-status')
export class DataStatusController {
  constructor(@Inject(DataStatusService) private readonly dataStatus: DataStatusService) {}

  @Get()
  @Header('Cache-Control', ROLLUP_CACHE)
  @ApiOkResponse({ type: DataStatusResponseDto })
  get(): Promise<DataStatusResponseDto> {
    return this.dataStatus.get()
  }
}
