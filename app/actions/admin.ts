'use server'

import { revalidatePath } from 'next/cache'
import { eq, and, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { bets, claims, ledger, markets, outcomes, boardState } from '@/db/schema'
import { getSession } from '@/lib/auth'
import { settle, type PoolBet, type PoolOutcome } from '@/lib/parimutuel'
import { CONFIG } from '@/content/config'

type Result = { ok: true } | { ok: false; error: string }

async function requireCommissioner() {
  const s = await getSession()
  if (!s?.commissioner) throw new Error('Commissioner only.')
  return s
}

/**
 * Pay out a market. Idempotent: the market row is locked and the status
 * re-checked inside the transaction, so a double-tap on Approve cannot pay twice.
 *
 * `finderId` is the player whose claim resolved it — they get the finder's fee.
 */
async function settleMarket(
  marketId: number,
  winningOutcomeId: number,
  note: string,
  finderId?: number,
) {
  await db.transaction(async (tx) => {
    const [m] = await tx.select().from(markets).where(eq(markets.id, marketId)).for('update')
    if (!m) throw new Error('Market not found.')
    if (m.status === 'resolved' || m.status === 'void') return // already done, no-op

    const outs = await tx.select().from(outcomes).where(eq(outcomes.marketId, marketId))
    const winner = outs.find((o) => o.id === winningOutcomeId)
    if (!winner) throw new Error('That outcome is not on this market.')

    const bs = await tx.select().from(bets).where(eq(bets.marketId, marketId))

    const poolOutcomes: PoolOutcome[] = outs.map((o) => ({ id: o.id, seedUnits: o.seedUnits }))
    const poolBets: PoolBet[] = bs.map((b) => ({
      id: b.id,
      playerId: b.playerId,
      outcomeId: b.outcomeId,
      stake: b.stake,
      weightBp: b.weightBp,
    }))

    const result = settle(poolOutcomes, poolBets, winningOutcomeId)

    for (const p of result.payouts) {
      if (p.amount <= 0) continue
      await tx.insert(ledger).values({
        playerId: p.playerId,
        delta: p.amount,
        reason: result.kind === 'void' ? 'refund' : 'payout',
        ref: `market:${marketId}`,
      })
    }

    if (finderId && result.kind === 'paid') {
      await tx.insert(ledger).values({
        playerId: finderId,
        delta: CONFIG.findersFee,
        reason: 'finders_fee',
        ref: `market:${marketId}`,
      })
    }

    await tx
      .update(markets)
      .set({
        status: result.kind === 'void' ? 'void' : 'resolved',
        resolvedOutcomeId: winningOutcomeId,
        resolutionNote: note.slice(0, 500),
        resolvedAt: new Date(),
      })
      .where(eq(markets.id, marketId))
  })
}

export async function resolveMarket(
  marketId: number,
  outcomeId: number,
  note: string,
): Promise<Result> {
  try {
    await requireCommissioner()
    await settleMarket(marketId, outcomeId, note)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not resolve.' }
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function approveClaim(claimId: number): Promise<Result> {
  try {
    await requireCommissioner()
    const [c] = await db.select().from(claims).where(eq(claims.id, claimId)).limit(1)
    if (!c) throw new Error('Claim not found.')
    if (c.status !== 'pending') throw new Error('That claim was already handled.')

    await settleMarket(c.marketId, c.outcomeId, `Claimed: "${c.quote}"`, c.claimantId)

    // Competing claims on the same market are moot once it settles.
    await db
      .update(claims)
      .set({ status: 'rejected' })
      .where(and(eq(claims.marketId, c.marketId), eq(claims.status, 'pending')))
    await db.update(claims).set({ status: 'approved' }).where(eq(claims.id, claimId))
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not approve.' }
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function rejectClaim(claimId: number): Promise<Result> {
  try {
    await requireCommissioner()
    await db.update(claims).set({ status: 'rejected' }).where(eq(claims.id, claimId))
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not reject.' }
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Refund everyone at cost and close the market. */
export async function voidMarket(marketId: number, note: string): Promise<Result> {
  try {
    await requireCommissioner()
    await db.transaction(async (tx) => {
      const [m] = await tx.select().from(markets).where(eq(markets.id, marketId)).for('update')
      if (!m) throw new Error('Market not found.')
      if (m.status === 'resolved' || m.status === 'void') return

      const bs = await tx.select().from(bets).where(eq(bets.marketId, marketId))
      const byPlayer = new Map<number, number>()
      for (const b of bs) byPlayer.set(b.playerId, (byPlayer.get(b.playerId) ?? 0) + b.stake)

      for (const [playerId, amount] of byPlayer) {
        await tx
          .insert(ledger)
          .values({ playerId, delta: amount, reason: 'refund', ref: `market:${marketId}` })
      }

      await tx
        .update(markets)
        .set({ status: 'void', resolutionNote: note.slice(0, 500), resolvedAt: new Date() })
        .where(eq(markets.id, marketId))
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not void.' }
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}

/** An ad-hoc market that closes in minutes. This is what keeps the app open all weekend. */
export async function pushLiveDrop(
  title: string,
  labels: string[],
  minutes: number,
): Promise<Result> {
  try {
    await requireCommissioner()
    const clean = labels.map((l) => l.trim()).filter(Boolean)
    if (!title.trim()) throw new Error('Give it a title.')
    if (clean.length < 2) throw new Error('Needs at least two outcomes.')
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
      throw new Error('Between 1 and 240 minutes.')
    }

    const slug = `live-${Date.now().toString(36)}`
    const [lowest] = await db.select().from(markets).orderBy(asc(markets.sort)).limit(1)

    await db.transaction(async (tx) => {
      const [m] = await tx
        .insert(markets)
        .values({
          slug,
          title: title.trim().slice(0, 140),
          blurb: 'Live drop. Closes fast.',
          category: 'live',
          kind: clean.length === 2 ? 'binary' : 'multi',
          locksAt: new Date(Date.now() + minutes * 60_000),
          claimable: true,
          maxStake: CONFIG.maxStakePerMarket,
          // Live drops pin above everything else on the feed.
          sort: (lowest?.sort ?? 0) - 1,
        })
        .returning({ id: markets.id })

      await tx.insert(outcomes).values(
        clean.map((label, i) => ({
          marketId: m.id,
          label: label.slice(0, 80),
          seedUnits: 10,
          sort: i,
        })),
      )
    })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not push that drop.' }
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Flips the leaderboard into settle-up mode. */
export async function closeWeekend(closed: boolean): Promise<Result> {
  try {
    await requireCommissioner()
    const [row] = await db.select().from(boardState).limit(1)
    if (row) {
      await db.update(boardState).set({ weekendClosed: closed }).where(eq(boardState.id, row.id))
    } else {
      await db.insert(boardState).values({ id: 1, weekendClosed: closed })
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not update.' }
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}
