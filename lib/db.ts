import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'
import { resolveDbUrl, isPooled } from './dbUrl'

type DB = PostgresJsDatabase<typeof schema>

let instance: DB | null = null

function connect(): DB {
  if (instance) return instance

  const url = resolveDbUrl('runtime')
  // One client per process. Serverless keeps these small on purpose.
  const globalForDb = globalThis as unknown as { __sql?: ReturnType<typeof postgres> }
  const sql =
    globalForDb.__sql ??
    postgres(url, {
      max: 5,
      // Transaction-mode poolers (Supabase :6543, pgbouncer) do not support the
      // prepared statements postgres.js opens by default. Without this the app
      // connects fine and then fails on real queries.
      prepare: !isPooled(url),
    })
  if (process.env.NODE_ENV !== 'production') globalForDb.__sql = sql

  instance = drizzle(sql, { schema })
  return instance
}

/**
 * Connects on first use, not on import.
 *
 * `next build` imports every page module to collect its config, which pulls this
 * file in. Connecting at module load meant the build itself needed a reachable
 * database — so a missing env var failed the build instead of the request, and
 * the error pointed at page collection rather than at the real cause. Deferring
 * the connection keeps the build a pure compile step; nothing dials out until a
 * request actually queries.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = connect() as unknown as Record<string | symbol, unknown>
    const value = real[prop]
    return typeof value === 'function' ? value.bind(real) : value
  },
})

export { schema }
