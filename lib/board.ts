import 'server-only'
import { asc, eq, inArray, sql as raw } from 'drizzle-orm'
import { db } from './db'
import { bets, claims, ledger, markets, outcomes, players, boardState } from '@/db/schema'
import { impliedPct, payoutMultiple, totalPool, type PoolBet, type PoolOutcome } from './parimutuel'
import { CONFIG } from '@/content/config'

export type OutcomeView = {
  id: number
  label: string
  subjectSlug: string | null
  seedUnits: number
  pool: number
  pct: number
  multiple: number
}

export type MarketView = {
  id: number
  slug: string
  title: string
  blurb: string
  category: string
  kind: string
  status: string
  locksAt: Date
  sealed: boolean
  claimable: boolean
  blocked: string[]
  maxStake: number
  sort: number
  resolvedOutcomeId: number | null
  resolutionNote: string | null
  /** Betting actually possible right now. */
  open: boolean
  /** Sealed markets hide their odds until they lock. */
  revealed: boolean
  totalPool: number
  outcomes: OutcomeView[]
}

function assemble(
  m: typeof markets.$inferSelect,
  outs: (typeof outcomes.$inferSelect)[],
  bs: (typeof bets.$inferSelect)[],
  now: Date,
): MarketView {
  const poolOutcomes: PoolOutcome[] = outs.map((o) => ({ id: o.id, seedUnits: o.seedUnits }))
  const poolBets: PoolBet[] = bs.map((b) => ({
    id: b.id,
    playerId: b.playerId,
    outcomeId: b.outcomeId,
    stake: b.stake,
    weightBp: b.weightBp,
  }))
  const locked = now.getTime() >= m.locksAt.getTime()
  return {
    ...m,
    open: m.status === 'open' && !locked,
    revealed: !m.sealed || locked || m.status === 'resolved',
    totalPool: totalPool(poolOutcomes, poolBets),
    outcomes: outs.map((o) => {
      const po = { id: o.id, seedUnits: o.seedUnits }
      return {
        id: o.id,
        label: o.label,
        subjectSlug: o.subjectSlug,
        seedUnits: o.seedUnits,
        pool: po.seedUnits + poolBets.filter((b) => b.outcomeId === o.id).reduce((n, b) => n + b.stake, 0),
        pct: impliedPct(po, poolOutcomes, poolBets),
        multiple: payoutMultiple(po, poolOutcomes, poolBets),
      }
    }),
  }
}

/** The whole board in three queries. Nine players and fifteen markets is not big data. */
export async function getBoard(now = new Date()): Promise<MarketView[]> {
  const ms = await db.select().from(markets).orderBy(asc(markets.sort), asc(markets.id))
  if (ms.length === 0) return []
  const ids = ms.map((m) => m.id)
  const outs = await db
    .select()
    .from(outcomes)
    .where(inArray(outcomes.marketId, ids))
    .orderBy(asc(outcomes.sort), asc(outcomes.id))
  const bs = await db.select().from(bets).where(inArray(bets.marketId, ids))

  return ms.map((m) =>
    assemble(
      m,
      outs.filter((o) => o.marketId === m.id),
      bs.filter((b) => b.marketId === m.id),
      now,
    ),
  )
}

export async function getMarket(slug: string, now = new Date()) {
  const [m] = await db.select().from(markets).where(eq(markets.slug, slug)).limit(1)
  if (!m) return null
  const outs = await db
    .select()
    .from(outcomes)
    .where(eq(outcomes.marketId, m.id))
    .orderBy(asc(outcomes.sort), asc(outcomes.id))
  const bs = await db.select().from(bets).where(eq(bets.marketId, m.id))
  return { view: assemble(m, outs, bs, now), bets: bs }
}

/** Balance is always the sum of the ledger. There is no cached column to drift. */
export async function getBalance(playerId: number): Promise<number> {
  const [row] = await db
    .select({ total: raw<number>`coalesce(sum(${ledger.delta}), 0)::int` })
    .from(ledger)
    .where(eq(ledger.playerId, playerId))
  return row?.total ?? 0
}

export type LeaderRow = {
  id: number
  slug: string
  name: string
  emoji: string
  cash: number
  atRisk: number
  bankroll: number
  realized: number
}

export async function getLeaderboard(): Promise<LeaderRow[]> {
  const ps = await db.select().from(players).orderBy(asc(players.id))
  const balances = await db
    .select({ playerId: ledger.playerId, total: raw<number>`sum(${ledger.delta})::int` })
    .from(ledger)
    .groupBy(ledger.playerId)

  // Stakes still riding on markets that have not settled.
  const openStakes = await db
    .select({ playerId: bets.playerId, total: raw<number>`sum(${bets.stake})::int` })
    .from(bets)
    .innerJoin(markets, eq(bets.marketId, markets.id))
    .where(inArray(markets.status, ['open', 'locked']))
    .groupBy(bets.playerId)

  const rows = ps.map((p) => {
    const cash = balances.find((b) => b.playerId === p.id)?.total ?? 0
    const atRisk = openStakes.find((b) => b.playerId === p.id)?.total ?? 0
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      emoji: p.emoji,
      cash,
      atRisk,
      bankroll: cash + atRisk,
      realized: cash + atRisk - CONFIG.startingBankroll,
    }
  })
  return rows.sort((a, b) => b.bankroll - a.bankroll || a.name.localeCompare(b.name))
}

export async function getClaims() {
  return db
    .select({
      id: claims.id,
      quote: claims.quote,
      status: claims.status,
      createdAt: claims.createdAt,
      marketSlug: markets.slug,
      marketTitle: markets.title,
      marketStatus: markets.status,
      outcomeLabel: outcomes.label,
      claimant: players.name,
      claimantEmoji: players.emoji,
    })
    .from(claims)
    .innerJoin(markets, eq(claims.marketId, markets.id))
    .innerJoin(outcomes, eq(claims.outcomeId, outcomes.id))
    .innerJoin(players, eq(claims.claimantId, players.id))
    .orderBy(asc(claims.status), raw`${claims.createdAt} desc`)
}

export async function getPlayers() {
  return db.select().from(players).orderBy(asc(players.id))
}

export async function isWeekendClosed(): Promise<boolean> {
  const [row] = await db.select().from(boardState).limit(1)
  return row?.weekendClosed ?? false
}

/** How much of this market the player already holds, for the per-market cap. */
export async function stakeInMarket(playerId: number, marketId: number): Promise<number> {
  const [row] = await db
    .select({ total: raw<number>`coalesce(sum(${bets.stake}), 0)::int` })
    .from(bets)
    .where(raw`${bets.playerId} = ${playerId} and ${bets.marketId} = ${marketId}`)
  return row?.total ?? 0
}

export async function myBets(playerId: number) {
  return db
    .select({
      id: bets.id,
      stake: bets.stake,
      weightBp: bets.weightBp,
      createdAt: bets.createdAt,
      outcomeLabel: outcomes.label,
      marketTitle: markets.title,
      marketSlug: markets.slug,
      marketStatus: markets.status,
      resolvedOutcomeId: markets.resolvedOutcomeId,
      outcomeId: outcomes.id,
    })
    .from(bets)
    .innerJoin(markets, eq(bets.marketId, markets.id))
    .innerJoin(outcomes, eq(bets.outcomeId, outcomes.id))
    .where(eq(bets.playerId, playerId))
    .orderBy(raw`${bets.createdAt} desc`)
}
