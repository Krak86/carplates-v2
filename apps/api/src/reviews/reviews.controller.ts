import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { ReviewsDto } from './reviews.dto.js'
import { ReviewsService } from './reviews.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional()
})

@ApiTags('reviews')
@Controller('api/reviews')
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly reviewsService: ReviewsService) {}

  // Links into the persisted infocar.ua catalog (pnpm ingest:infocar), not proxied live — see reviews.service.ts.
  @Get()
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiOkResponse({ type: ReviewsDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<ReviewsDto> {
    return this.reviewsService.lookup(query)
  }
}
