import { createReadStream } from 'node:fs'

import { Controller, Get, Inject, Query, Res } from '@nestjs/common'
import { ApiExcludeEndpoint, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import type { FastifyReply } from 'fastify'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'
import { CncapRatingsDto } from './cncap.dto.js'
import { CncapService } from './cncap.service.js'
import { EuroNcapRatingsDto } from './euroncap.dto.js'
import { EuroNcapService } from './euroncap.service.js'
import { JncapRatingsDto } from './jncap.dto.js'
import { JncapService } from './jncap.service.js'
import { SafetyRatingsDto } from './safety.dto.js'
import { SafetyService } from './safety.service.js'
import { SafetyVideoService } from './safety-video.service.js'

const querySchema = z.object({
  make: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1900).max(2100)
})

const videoQuerySchema = z.object({
  url: z.string().url()
})

@ApiTags('safety')
@Controller('api/safety')
export class SafetyController {
  constructor(
    @Inject(SafetyService) private readonly safetyService: SafetyService,
    @Inject(SafetyVideoService) private readonly safetyVideoService: SafetyVideoService,
    @Inject(EuroNcapService) private readonly euroNcapService: EuroNcapService,
    @Inject(JncapService) private readonly jncapService: JncapService,
    @Inject(CncapService) private readonly cncapService: CncapService
  ) {}

  @Get()
  @ApiQuery({ name: 'make', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiOkResponse({ type: SafetyRatingsDto })
  ratings(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<SafetyRatingsDto> {
    return this.safetyService.ratings(query.make, query.model, query.year)
  }

  // Persisted (scraped), not proxied live — see euroncap.service.ts / scripts/src/euroncap.ts.
  @Get('euroncap')
  @ApiQuery({ name: 'make', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiOkResponse({ type: EuroNcapRatingsDto })
  euroNcapRatings(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<EuroNcapRatingsDto> {
    return this.euroNcapService.ratings(query.make, query.model, query.year)
  }

  // Persisted (scraped), not proxied live — see jncap.service.ts / scripts/src/jncap.ts.
  @Get('jncap')
  @ApiQuery({ name: 'make', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiOkResponse({ type: JncapRatingsDto })
  jncapRatings(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<JncapRatingsDto> {
    return this.jncapService.ratings(query.make, query.model, query.year)
  }

  // Persisted (scraped), not proxied live — see cncap.service.ts / scripts/src/cncap.ts.
  @Get('cncap')
  @ApiQuery({ name: 'make', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiOkResponse({ type: CncapRatingsDto })
  cncapRatings(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<CncapRatingsDto> {
    return this.cncapService.ratings(query.make, query.model, query.year)
  }

  // Binary stream, not a Zod DTO response — the one exception to "no @Res()" (see SpaController).
  @Get('video')
  @ApiExcludeEndpoint()
  async video(
    @Query(zodParam(videoQuerySchema)) query: z.infer<typeof videoQuerySchema>,
    @Res() reply: FastifyReply
  ): Promise<void> {
    const path = await this.safetyVideoService.transcode(query.url)
    reply.type('video/mp4').send(createReadStream(path))
  }
}
