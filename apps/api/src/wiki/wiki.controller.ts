import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'
import { WikiImageDto, WikiInfoDto } from './wiki.dto.js'
import { WIKI_IMAGE_SOURCES, WikiService } from './wiki.service.js'

/** With `yearOnly`: how many earlier model years may stand in when the asked year has no photo. */
const MAX_YEAR_BACK = 5

const querySchema = z.object({
  brand: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  lang: z.string().trim().min(1).default('en'),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  source: z.enum(WIKI_IMAGE_SOURCES).optional(),
  yearOnly: z.enum(['true']).optional(),
  yearBack: z.coerce.number().int().min(0).max(MAX_YEAR_BACK).optional()
})

const imageQuerySchema = querySchema.omit({ lang: true })
const infoQuerySchema = querySchema.omit({ yearOnly: true, yearBack: true })

@ApiTags('wiki')
@Controller('api/wiki')
export class WikiController {
  constructor(@Inject(WikiService) private readonly wikiService: WikiService) {}

  @Get('image')
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'year', required: false, description: 'Model year — picks a matching-generation photo' })
  @ApiQuery({ name: 'source', required: false, enum: WIKI_IMAGE_SOURCES })
  @ApiQuery({ name: 'yearOnly', required: false, description: "'true': only a photo of exactly that model year" })
  @ApiQuery({ name: 'yearBack', required: false, description: 'With yearOnly: also try up to this many earlier years (max 5), nearest first' })
  @ApiOkResponse({ type: WikiImageDto })
  lookupImage(@Query(zodParam(imageQuerySchema)) query: z.infer<typeof imageQuerySchema>): Promise<WikiImageDto> {
    return this.wikiService.lookupImage(query.brand ?? '', query.model ?? '', {
      year: query.year,
      source: query.source,
      yearOnly: query.yearOnly === 'true',
      yearBack: query.yearBack
    })
  }

  @Get()
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'lang', required: false })
  @ApiQuery({ name: 'year', required: false, description: 'Model year — picks a matching-generation photo' })
  @ApiQuery({ name: 'source', required: false, enum: WIKI_IMAGE_SOURCES })
  @ApiOkResponse({ type: WikiInfoDto })
  lookup(@Query(zodParam(infoQuerySchema)) query: z.infer<typeof infoQuerySchema>): Promise<WikiInfoDto> {
    return this.wikiService.lookup(query.brand ?? '', query.model ?? '', query.lang, {
      year: query.year,
      source: query.source
    })
  }
}
