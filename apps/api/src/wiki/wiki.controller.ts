import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'
import { WikiInfoDto } from './wiki.dto.js'
import { WIKI_IMAGE_SOURCES, WikiService } from './wiki.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  lang: z.string().trim().min(1).default('en'),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  source: z.enum(WIKI_IMAGE_SOURCES).optional()
})

@ApiTags('wiki')
@Controller('api/wiki')
export class WikiController {
  constructor(@Inject(WikiService) private readonly wikiService: WikiService) {}

  @Get()
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'lang', required: false })
  @ApiQuery({ name: 'year', required: false, description: 'Model year — picks a matching-generation photo' })
  @ApiQuery({ name: 'source', required: false, enum: WIKI_IMAGE_SOURCES })
  @ApiOkResponse({ type: WikiInfoDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<WikiInfoDto> {
    return this.wikiService.lookup(query.brand ?? '', query.model ?? '', query.lang, {
      year: query.year,
      source: query.source
    })
  }
}
