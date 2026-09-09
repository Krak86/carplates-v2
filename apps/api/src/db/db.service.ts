import { Injectable } from '@nestjs/common'
import type { OnModuleDestroy } from '@nestjs/common'
import { createDb } from '@carplates/db'
import type { Db } from '@carplates/db'

import { loadEnv } from '../env.js'

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly conn = createDb(loadEnv().DATABASE_URL)

  get db(): Db {
    return this.conn.db
  }

  async onModuleDestroy(): Promise<void> {
    await this.conn.close()
  }
}
