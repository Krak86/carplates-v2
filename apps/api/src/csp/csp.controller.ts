import { Body, Controller, Header, HttpCode, Inject, Post } from '@nestjs/common'
import { ApiNoContentResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'

import { CSP_REPORT_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { CspService } from './csp.service.js'
import { cspReportRequestSchema } from './types.js'
import type { CspReportRequest } from './types.js'

@ApiTags('csp')
@Controller('api/csp-report')
export class CspController {
  constructor(@Inject(CspService) private readonly csp: CspService) {}

  /** `report-uri` sink: browsers POST here unauthenticated and without a normal Origin (exempt from `OriginGuard`). */
  @Post()
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @Throttle(CSP_REPORT_THROTTLE)
  @ApiNoContentResponse({ description: 'Report accepted (noise is dropped silently)' })
  report(@Body(zodParam(cspReportRequestSchema)) body: CspReportRequest): void {
    this.csp.record(body)
  }
}
