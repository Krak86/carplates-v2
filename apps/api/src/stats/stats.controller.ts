import { Controller, Get, Inject } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { DataVersionResponseDto, StatsResponseDto } from './stats.dto.js'
import { StatsService } from './stats.service.js'

@ApiTags('stats')
@Controller('api/stats')
export class StatsController {
  constructor(@Inject(StatsService) private readonly statsService: StatsService) {}

  @Get()
  @ApiOkResponse({ type: StatsResponseDto })
  get(): Promise<StatsResponseDto> {
    return this.statsService.get()
  }

  @Get('version')
  @ApiOkResponse({ type: DataVersionResponseDto })
  version(): Promise<DataVersionResponseDto> {
    return this.statsService.version()
  }
}
