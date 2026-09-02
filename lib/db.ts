import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'
import { resolveDbUrl, isPooled } from './dbUrl'

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

export const db = drizzle(sql, { schema })
export { schema }
