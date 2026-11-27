import { Injectable } from '@nestjs/common'
import type { OnModuleDestroy } from '@nestjs/common'
import { createDb } from '@carplates/db'
import type { Db, DbLimits } from '@carplates/db'

import { loadEnv } from '../env.js'

function apiLimits(): DbLimits {
  const env = loadEnv()
  return {
    max: env.DB_POOL_MAX,
    connectionTimeoutMillis: env.DB_CONNECT_TIMEOUT_MS,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    statementTimeoutMs: env.DB_STATEMENT_TIMEOUT_MS,
    idleInTransactionTimeoutMs: env.DB_IDLE_IN_TX_TIMEOUT_MS,
    lockTimeoutMs: env.DB_LOCK_TIMEOUT_MS
  }
}

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly conn = createDb(loadEnv().DATABASE_URL, apiLimits())

  get db(): Db {
    return this.conn.db
  }

  async onModuleDestroy(): Promise<void> {
    await this.conn.close()
  }
}
