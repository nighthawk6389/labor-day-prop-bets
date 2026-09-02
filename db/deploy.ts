/**
 * Deploy-time database setup. Wired to `vercel-build`, so it runs on every deploy.
 *
 * Two jobs, in order:
 *   1. Apply committed migrations over an unpooled connection
 *   2. Seed the board — but ONLY when no real bets exist yet
 *
 * The guard is the important part. Seeding wipes the ledger, so running it
 * unconditionally would erase everyone's bets on any mid-weekend redeploy.
 * Keying on bets rather than markets means the card can still be tuned and
 * redeployed right up until the first bet lands, at which point the board
 * freezes itself. FORCE_RESEED=1 overrides for a deliberate wipe.
 */
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { sql as raw } from 'drizzle-orm'
import * as schema from './schema'
import { seedBoard, CODES } from './seedBoard'
import { resolveDbUrl } from '../lib/dbUrl'

async function main() {
  // DDL must not go through a transaction-mode pooler.
  const url = resolveDbUrl('migration')
  const host = url.replace(/\/\/[^@]*@/, '//***@')
  console.log(`→ database: ${host.split('?')[0]}`)

  const sql = postgres(url, { max: 1, prepare: false })
  const db = drizzle(sql, { schema })

  try {
    console.log('→ applying migrations...')
    await migrate(db, { migrationsFolder: 'db/migrations' })
    console.log('✓ schema up to date')

    const [{ count }] = await db.execute<{ count: number }>(
      raw`select count(*)::int as count from bets`,
    )
    const force = process.env.FORCE_RESEED === '1'

    if (count > 0 && !force) {
      const [{ count: mkts }] = await db.execute<{ count: number }>(
        raw`select count(*)::int as count from markets`,
      )
      console.log(
        `✓ board is live — ${count} bet(s) down across ${mkts} market(s). Leaving it alone.`,
      )
      console.log('  (set FORCE_RESEED=1 to wipe and rebuild anyway)')
      return
    }

    if (force && count > 0) {
      console.log(`! FORCE_RESEED set — wiping ${count} existing bet(s)`)
    }

    await seedBoard(db, (s) => console.log(`  ${s}`))
    console.log('\n  Login codes (from content/players.ts):')
    for (const c of CODES) console.log(`    ${c.name.padEnd(16)} ${c.code}`)
  } finally {
    await sql.end()
  }
}

main().catch((e) => {
  console.error('\n✗ deploy setup failed:\n', e)
  process.exit(1)
})
