import { Controller, Get, Header, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { SocialDto } from './social.dto.js'
import { SocialService } from './social.service.js'

const querySchema = z.object({ brand: z.string().trim().min(1).max(60) })

@ApiTags('social')
@Controller('api/social')
export class SocialController {
  constructor(@Inject(SocialService) private readonly socialService: SocialService) {}

  // Polled YouTube channel feeds (pnpm ingest:social), not proxied live: the make's channel, then its group's.
  @Get()
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiQuery({ name: 'brand', required: true })
  @ApiOkResponse({ type: SocialDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<SocialDto> {
    return this.socialService.lookup(query.brand)
  }
}
