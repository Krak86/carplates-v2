import { Controller, Get, Inject } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { StatsResponseDto } from './stats.dto.js'
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
}
