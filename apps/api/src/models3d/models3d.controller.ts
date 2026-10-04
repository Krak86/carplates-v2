import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { Models3dDto } from './models3d.dto.js'
import { Models3dService } from './models3d.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1)
})

@ApiTags('models3d')
@Controller('api/models3d')
export class Models3dController {
  constructor(@Inject(Models3dService) private readonly models3dService: Models3dService) {}

  // Links into the persisted Sketchfab catalog (pnpm ingest:sketchfab), not proxied live — see models3d.service.ts.
  @Get()
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiOkResponse({ type: Models3dDto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<Models3dDto> {
    return this.models3dService.lookup(query.brand, query.model)
  }
}
