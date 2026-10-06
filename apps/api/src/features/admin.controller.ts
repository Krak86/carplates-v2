import { Controller, Get, Header, Inject, UseGuards } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'

import { AdminGuard } from '../auth/session.guard.js'

import { AdminUsersDto } from './features.dto.js'
import { FeaturesService } from './features.service.js'

/** Read-only admin views. The admin role itself is granted in the DB only (see migrations/0034_app_accounts.sql). */
@ApiTags('admin')
@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(@Inject(FeaturesService) private readonly featuresService: FeaturesService) {}

  @Get('users')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: AdminUsersDto })
  async users(): Promise<AdminUsersDto> {
    return { users: await this.featuresService.listUsers() }
  }
}
