'use server'

import { revalidatePath } from 'next/cache'
import { eq, sql as raw } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bets, claims, ledger, markets, outcomes, players } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { CONFIG } from '@/content/config'

type Result = { ok: true } | { ok: false; error: string }

/**
 * Place a bet. Runs in one transaction that locks the player row first —
 * that serializes a single player's spending across simultaneous markets,
 * which is exactly where a double-spend would otherwise hide.
 */
export async function placeBet(marketId: number, outcomeId: number, stake: number): Promise<Result> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Not signed in.' }
  if (!Number.isInteger(stake) || stake <= 0) return { ok: false, error: 'Stake must be a whole number.' }

  try {
    await db.transaction(async (tx) => {
      // Serialize this player's spending.
      const [me] = await tx.select().from(players).where(eq(players.id, session.playerId)).for('update')
      if (!me) throw new Error('Player not found.')

      const [m] = await tx.select().from(markets).where(eq(markets.id, marketId)).limit(1)
      if (!m) throw new Error('Market not found.')
      if (m.status !== 'open') throw new Error('That market is already settled.')
      if (Date.now() >= m.locksAt.getTime()) throw new Error('That market is closed.')

      // Whole market is about them.
      if (m.blocked.includes(me.slug)) {
        throw new Error('You cannot bet on a market about you.')
      }

      const [o] = await tx.select().from(outcomes).where(eq(outcomes.id, outcomeId)).limit(1)
      if (!o || o.marketId !== marketId) throw new Error('Outcome not found.')

      // Nobody bets on themselves — kills the biggest exploit in social prop betting.
      if (o.subjectSlug && o.subjectSlug === me.slug) {
        throw new Error('You cannot bet on yourself.')
      }

      const [bal] = await tx
        .select({ total: raw<number>`coalesce(sum(${ledger.delta}), 0)::int` })
        .from(ledger)
        .where(eq(ledger.playerId, me.id))
      if ((bal?.total ?? 0) < stake) throw new Error('Not enough in your bankroll.')

      const [held] = await tx
        .select({ total: raw<number>`coalesce(sum(${bets.stake}), 0)::int` })
        .from(bets)
        .where(raw`${bets.playerId} = ${me.id} and ${bets.marketId} = ${marketId}`)
      if ((held?.total ?? 0) + stake > m.maxStake) {
        throw new Error(`Cap is ${CONFIG.currency}${m.maxStake} per market.`)
      }

      const weightBp =
        Date.now() < new Date(CONFIG.earlyBirdUntil).getTime()
          ? CONFIG.earlyBirdWeightBp
          : CONFIG.normalWeightBp

      const [placed] = await tx
        .insert(bets)
        .values({ playerId: me.id, marketId, outcomeId, stake, weightBp })
        .returning({ id: bets.id })

      await tx.insert(ledger).values({
        playerId: me.id,
        delta: -stake,
        reason: 'bet',
        ref: String(placed.id),
      })
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not place that bet.' }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Anyone can file a claim. The commissioner confirms it. */
export async function fileClaim(marketId: number, outcomeId: number, quote: string): Promise<Result> {
  const session = await getSession()
  if (!session) return { ok: false, error: 'Not signed in.' }

  try {
    const [m] = await db.select().from(markets).where(eq(markets.id, marketId)).limit(1)
    if (!m) throw new Error('Market not found.')
    if (!m.claimable) throw new Error('That market is not claimable.')
    if (m.status === 'resolved' || m.status === 'void') throw new Error('That market is already settled.')

    const [o] = await db.select().from(outcomes).where(eq(outcomes.id, outcomeId)).limit(1)
    if (!o || o.marketId !== marketId) throw new Error('Outcome not found.')

    await db.insert(claims).values({
      marketId,
      outcomeId,
      claimantId: session.playerId,
      quote: quote.slice(0, 280),
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not file that claim.' }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}
