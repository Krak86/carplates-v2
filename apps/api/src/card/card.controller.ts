import { Controller, Get, Inject, Param } from '@nestjs/common'
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'
import { CardBundleDto } from './card.dto.js'
import { CardService } from './card.service.js'

@ApiTags('card')
@Controller('api/card')
export class CardController {
  constructor(@Inject(CardService) private readonly cardService: CardService) {}

  /** The above-the-fold reference data of a plate's result card in one answer — asked in parallel with the plate lookup. */
  @Get(':plate')
  @ApiParam({ name: 'plate', example: 'ВЕ7116АА', description: 'Latin or Cyrillic; normalized server-side' })
  @ApiOkResponse({ type: CardBundleDto })
  bundle(@Param('plate', zodParam(z.string().min(1).max(20))) plate: string): Promise<CardBundleDto> {
    return this.cardService.bundle(plate)
  }
}
