import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'

import { Models360Dto } from './models360.dto.js'
import { Models360Service } from './models360.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1)
})

@ApiTags('models360')
@Controller('api/models360')
export class Models360Controller {
  constructor(@Inject(Models360Service) private readonly models360Service: Models360Service) {}

  // Links into the persisted CarShow360 + Winner catalogs (pnpm ingest:carshow360 / ingest:winner360), not proxied live — see models360.service.ts.
  @Get()
  @ApiQuery({ name: 'brand', required: true })
  @ApiQuery({ name: 'model', required: true })
  @ApiOkResponse({ type: Models360Dto })
  lookup(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<Models360Dto> {
    return this.models360Service.lookup(query.brand, query.model)
  }
}
