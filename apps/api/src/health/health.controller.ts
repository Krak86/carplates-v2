import { Controller, Get, Inject } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'
import { sql } from 'drizzle-orm'

import { DbService } from '../db/db.service.js'

@Controller()
export class HealthController {
  constructor(@Inject(DbService) private readonly dbService: DbService) {}

  @Get('healthz')
  @ApiExcludeEndpoint()
  async health(): Promise<{ status: 'ok'; db: 'up' | 'down' }> {
    const db = await this.dbService.db
      .execute(sql`select 1`)
      .then((): 'up' | 'down' => 'up')
      .catch((): 'up' | 'down' => 'down')
    return { status: 'ok', db }
  }
}
