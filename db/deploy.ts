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
import { resolveDbUrl, hasDbUrl } from '../lib/dbUrl'

async function main() {
  // A build with no database configured still has to produce something.
  // On production that is a real misconfiguration and should stop the deploy
  // loudly. On a preview it usually just means the integration is scoped to
  // production, and failing there would redden every pull request for a
  // reason that has nothing to do with the change.
  if (!hasDbUrl()) {
    const where = process.env.VERCEL_ENV ?? 'local'
    const wanted = 'POSTGRES_URL (runtime) and POSTGRES_URL_NON_POOLING (migrations)'
    if (where === 'production') {
      throw new Error(
        `No database connection string on a production deploy.\n` +
          `Add ${wanted} in the Vercel project's environment variables — ` +
          `the Postgres/Supabase integration sets both — then redeploy.`,
      )
    }
    console.log(`! no database configured for this ${where} build — skipping setup`)
    console.log(`  the app will need ${wanted} to serve requests`)
    return
  }

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
