/**
 * Local convenience wrapper: rebuilds the board unconditionally.
 *
 * Deploys use db/deploy.ts instead, which guards against wiping live bets.
 * This one does not — it is for local work where that is what you want.
 */
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { seedBoard, CODES } from './seedBoard'
import { resolveDbUrl, isPooled } from '../lib/dbUrl'

const url = resolveDbUrl('migration')
const sql = postgres(url, { max: 1, prepare: !isPooled(url) })
const db = drizzle(sql, { schema })

seedBoard(db)
  .then(() => {
    console.log('\nLogin codes:')
    for (const c of CODES) console.log(`  ${c.name.padEnd(16)} ${c.code}`)
    return sql.end()
  })
  .catch(async (e) => {
    console.error(e)
    await sql.end()
    process.exit(1)
  })
