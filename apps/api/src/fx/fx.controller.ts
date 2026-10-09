import { Controller, Get, Inject } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { FxResponseDto } from './fx.dto.js'
import { FxService } from './fx.service.js'

@ApiTags('fx')
@Controller('api/fx')
export class FxController {
  constructor(@Inject(FxService) private readonly fxService: FxService) {}

  @Get()
  @ApiOkResponse({ type: FxResponseDto })
  rates(): Promise<FxResponseDto> {
    return this.fxService.rates()
  }
}
