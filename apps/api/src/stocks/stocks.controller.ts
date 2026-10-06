import { Controller, Get, Header, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'
import { DEFAULT_STOCK_RANGE, STOCK_RANGES } from '@carplates/shared'

import { zodParam } from '../common/zod-param.pipe.js'

import { StockDto } from './stocks.dto.js'
import { StocksService } from './stocks.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1).max(60),
  range: z.enum(STOCK_RANGES).default(DEFAULT_STOCK_RANGE)
})

@ApiTags('stocks')
@Controller('api/stocks')
export class StocksController {
  constructor(@Inject(StocksService) private readonly stocksService: StocksService) {}

  // Proxied live (browsers can't call Yahoo directly) and cached server-side; `company: null` = the brand has no listing.
  @Get()
  @Header('Cache-Control', 'public, max-age=300')
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'range', required: false, enum: STOCK_RANGES })
  @ApiOkResponse({ type: StockDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<StockDto> {
    return this.stocksService.lookup(query.brand, query.range)
  }
}
