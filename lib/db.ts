import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@/db/schema'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

// One client per process. Serverless keeps these small on purpose.
const globalForDb = globalThis as unknown as { __sql?: ReturnType<typeof postgres> }
const sql = globalForDb.__sql ?? postgres(url, { max: 5 })
if (process.env.NODE_ENV !== 'production') globalForDb.__sql = sql

export const db = drizzle(sql, { schema })
export { schema }
