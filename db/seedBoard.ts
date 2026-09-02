/**
 * Builds the board from content/. Shared by the CLI (`npm run seed`) and the
 * deploy hook (db/deploy.ts) so the wipe-and-rebuild logic exists in one place.
 *
 * This is destructive: it clears markets, outcomes, bets, claims and the ledger,
 * then re-grants opening bankrolls. Callers are responsible for deciding whether
 * that is safe — db/deploy.ts refuses once real bets exist.
 */
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import { PLAYERS } from '../content/players'
import { MARKETS } from '../content/markets'
import { CONFIG } from '../content/config'

const { players, markets, outcomes, bets, claims, ledger, boardState } = schema

type DB = PostgresJsDatabase<typeof schema>

export async function seedBoard(db: DB, log: (s: string) => void = console.log) {
  log('Clearing the board...')
  await db.delete(ledger)
  await db.delete(claims)
  await db.delete(bets)
  await db.delete(outcomes)
  await db.delete(markets)

  log('Seeding players...')
  for (const p of PLAYERS) {
    const pinHash = await bcrypt.hash(p.code, 10)
    const [existing] = await db.select().from(players).where(eq(players.slug, p.slug)).limit(1)
    const values = {
      name: p.name,
      emoji: p.emoji,
      isCommissioner: !!p.commissioner,
      pinHash,
    }
    if (existing) {
      await db.update(players).set(values).where(eq(players.id, existing.id))
    } else {
      await db.insert(players).values({ slug: p.slug, ...values })
    }
  }

  log('Granting bankrolls...')
  const roster = await db.select().from(players)
  for (const p of roster) {
    await db.insert(ledger).values({
      playerId: p.id,
      delta: CONFIG.startingBankroll,
      reason: 'grant',
      ref: 'opening',
    })
  }

  log('Seeding markets...')
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
  if (state) {
    await db.update(boardState).set({ weekendClosed: false }).where(eq(boardState.id, state.id))
  } else {
    await db.insert(boardState).values({ id: 1, weekendClosed: false })
  }

  log(`Board is up: ${MARKETS.length} markets, ${roster.length} players.`)
  return { markets: MARKETS.length, players: roster.length }
}

/** The codes, for printing after a seed. They live in content/players.ts. */
export const CODES = PLAYERS.map((p) => ({ name: p.name, code: p.code }))
