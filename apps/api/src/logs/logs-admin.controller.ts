import { Controller, Get, Header, Inject, Query, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { createZodDto } from 'nestjs-zod'
import { adminLogContainersResponseSchema, adminLogsQuerySchema, adminLogsResponseSchema } from '@carplates/shared'
import type { AdminLogsQuery, SessionUser } from '@carplates/shared'

import { AdminGuard, CurrentUser } from '../auth/session.guard.js'
import { LOGS_ADMIN_THROTTLE } from '../common/throttle.js'
import { zodParam } from '../common/zod-param.pipe.js'

import { LogsService } from './logs.service.js'

class AdminLogsDto extends createZodDto(adminLogsResponseSchema) {}
class AdminLogContainersDto extends createZodDto(adminLogContainersResponseSchema) {}

/** Redacted container logs from Loki. Admin-only, never cached, and the client sends filters, not LogQL (`docs/logs-plan.md`). */
@ApiTags('admin')
@Controller('api/admin/logs')
@UseGuards(AdminGuard)
@Throttle(LOGS_ADMIN_THROTTLE)
export class LogsAdminController {
  constructor(@Inject(LogsService) private readonly logs: LogsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AdminLogsDto })
  search(
    @Query(zodParam(adminLogsQuerySchema)) query: AdminLogsQuery,
    @CurrentUser() admin: SessionUser
  ): Promise<AdminLogsDto> {
    return this.logs.query(query, admin.id)
  }

  @Get('containers')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AdminLogContainersDto })
  containers(): Promise<AdminLogContainersDto> {
    return this.logs.containers()
  }
}
