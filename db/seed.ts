/**
 * Rebuilds the board from content/. Run with `npm run seed`.
 *
 * Safe to re-run: it wipes markets, outcomes, bets, claims and the ledger,
 * then re-grants everyone their opening bankroll. Players keep their PINs
 * unless --new-pins is passed, so you only text them out once.
 */
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import * as schema from './schema'
import { PLAYERS } from '../content/players'
import { MARKETS } from '../content/markets'
import { CONFIG } from '../content/config'

const { players, markets, outcomes, bets, claims, ledger, boardState } = schema

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')

const sql = postgres(url, { max: 1 })
const db = drizzle(sql, { schema })

const newPins = process.argv.includes('--new-pins')
const pin4 = () => String(Math.floor(1000 + Math.random() * 9000))

async function main() {
  console.log('Clearing the board...')
  await db.delete(ledger)
  await db.delete(claims)
  await db.delete(bets)
  await db.delete(outcomes)
  await db.delete(markets)

  const issued: { name: string; pin: string }[] = []

  console.log('Seeding players...')
  for (const p of PLAYERS) {
    const [existing] = await db.select().from(players).where(eq(players.slug, p.slug)).limit(1)

    if (existing && !newPins) {
      await db
        .update(players)
        .set({ name: p.name, emoji: p.emoji, isCommissioner: !!p.commissioner })
        .where(eq(players.id, existing.id))
    } else {
      const pin = pin4()
      const pinHash = await bcrypt.hash(pin, 10)
      issued.push({ name: p.name, pin })
      if (existing) {
        await db
          .update(players)
          .set({ name: p.name, emoji: p.emoji, isCommissioner: !!p.commissioner, pinHash })
          .where(eq(players.id, existing.id))
      } else {
        await db.insert(players).values({
          slug: p.slug,
          name: p.name,
          emoji: p.emoji,
          isCommissioner: !!p.commissioner,
          pinHash,
        })
      }
    }
  }

  console.log('Granting bankrolls...')
  const roster = await db.select().from(players)
  for (const p of roster) {
    await db.insert(ledger).values({
      playerId: p.id,
      delta: CONFIG.startingBankroll,
      reason: 'grant',
      ref: 'opening',
    })
  }

  console.log('Seeding markets...')
  let sort = 0
  for (const m of MARKETS) {
    const [row] = await db
      .insert(markets)
      .values({
        slug: m.slug,
        title: m.title,
        blurb: m.blurb,
        category: m.category,
        kind: m.kind,
        locksAt: new Date(m.locksAt),
        sealed: !!m.sealed,
        claimable: !!m.claimable,
        blocked: m.blocked ?? [],
        maxStake: CONFIG.maxStakePerMarket,
        sort: sort++,
      })
      .returning({ id: markets.id })

    await db.insert(outcomes).values(
      m.outcomes.map((o, i) => ({
        marketId: row.id,
        label: o.label,
        seedUnits: o.seed,
        subjectSlug: o.subject ?? null,
        sort: i,
      })),
    )
  }

  const [state] = await db.select().from(boardState).limit(1)
  if (!state) await db.insert(boardState).values({ id: 1, weekendClosed: false })
  else await db.update(boardState).set({ weekendClosed: false }).where(eq(boardState.id, state.id))

  console.log(`\nBoard is up: ${MARKETS.length} markets, ${roster.length} players.`)

  if (issued.length) {
    console.log('\n─────────── PINs — text these out, they are not recoverable ───────────')
    for (const i of issued) console.log(`  ${i.name.padEnd(16)} ${i.pin}`)
    console.log('───────────────────────────────────────────────────────────────────────')
  } else {
    console.log('\nExisting PINs kept. Re-run with --new-pins to reissue them.')
  }

  await sql.end()
}

main().catch(async (e) => {
  console.error(e)
  await sql.end()
  process.exit(1)
})
