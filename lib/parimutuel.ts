/**
 * Parimutuel pool math. Pure functions, no I/O — this is the only place
 * money is computed, and it is the only place that needs to be exactly right.
 *
 * Everyone's stake goes into one pot per market. Winners split the whole pot
 * in proportion to their stake. There is no fixed price to exploit, so
 * classic arbitrage is impossible by construction.
 */

export type PoolBet = {
  id: number
  playerId: number
  outcomeId: number
  stake: number
  /** Basis points of 100. 125 = early-bird 1.25x. */
  weightBp: number
}

export type PoolOutcome = {
  id: number
  seedUnits: number
}

export type Payout = {
  playerId: number
  amount: number
  betIds: number[]
}

export type Settlement = {
  /** 'paid' when someone backed the winner, 'void' when nobody did. */
  kind: 'paid' | 'void'
  totalPool: number
  payouts: Payout[]
}

/** Seed units plus every unit staked. This is what gets handed out. */
export function totalPool(outcomes: PoolOutcome[], bets: PoolBet[]): number {
  const seeds = outcomes.reduce((n, o) => n + o.seedUnits, 0)
  const staked = bets.reduce((n, b) => n + b.stake, 0)
  return seeds + staked
}

/** Unweighted units behind one outcome — what the display uses. */
export function outcomePool(
  outcome: PoolOutcome,
  bets: PoolBet[],
): number {
  const staked = bets
    .filter((b) => b.outcomeId === outcome.id)
    .reduce((n, b) => n + b.stake, 0)
  return outcome.seedUnits + staked
}

/**
 * The number shown on the card. Displayed odds are unweighted while
 * settlement is weighted, so an early bet quietly pays a little more than
 * advertised — intentional, and the bet slip says so.
 */
export function impliedPct(outcome: PoolOutcome, outcomes: PoolOutcome[], bets: PoolBet[]): number {
  const total = totalPool(outcomes, bets)
  if (total <= 0) return 0
  return outcomePool(outcome, bets) / total
}

/** "Pays 2.4x" — total pot divided by what is already behind this outcome. */
export function payoutMultiple(
  outcome: PoolOutcome,
  outcomes: PoolOutcome[],
  bets: PoolBet[],
): number {
  const behind = outcomePool(outcome, bets)
  if (behind <= 0) return 0
  return totalPool(outcomes, bets) / behind
}

/**
 * Split the pot among everyone who backed the winner.
 *
 * Integer units throughout: each payout is floored, and the rounding
 * remainder goes to the largest winning stake so the books balance exactly.
 * Nobody backed the winner -> void, and every stake is refunded.
 */
export function settle(
  outcomes: PoolOutcome[],
  bets: PoolBet[],
  winningOutcomeId: number,
): Settlement {
  const pot = totalPool(outcomes, bets)
  const winners = bets.filter((b) => b.outcomeId === winningOutcomeId)

  if (winners.length === 0) {
    // Refund every stake at cost. The house seed simply evaporates.
    const byPlayer = new Map<number, Payout>()
    for (const b of bets) {
      const row = byPlayer.get(b.playerId) ?? { playerId: b.playerId, amount: 0, betIds: [] }
      row.amount += b.stake
      row.betIds.push(b.id)
      byPlayer.set(b.playerId, row)
    }
    return { kind: 'void', totalPool: pot, payouts: [...byPlayer.values()] }
  }

  const totalWeight = winners.reduce((n, b) => n + b.stake * b.weightBp, 0)

  // Floor each winning bet's share, tracking the shortfall.
  const perBet = winners.map((b) => ({
    bet: b,
    amount: Math.floor(((b.stake * b.weightBp) / totalWeight) * pot),
  }))
  const distributed = perBet.reduce((n, p) => n + p.amount, 0)
  let remainder = pot - distributed

  if (remainder > 0) {
    // Largest stake takes the rounding dust; ties break on lowest bet id
    // so settlement is deterministic and re-runnable.
    let best = perBet[0]
    for (const p of perBet) {
      if (p.bet.stake > best.bet.stake) best = p
      else if (p.bet.stake === best.bet.stake && p.bet.id < best.bet.id) best = p
    }
    best.amount += remainder
    remainder = 0
  }

  const byPlayer = new Map<number, Payout>()
  for (const p of perBet) {
    const row = byPlayer.get(p.bet.playerId) ?? {
      playerId: p.bet.playerId,
      amount: 0,
      betIds: [],
    }
    row.amount += p.amount
    row.betIds.push(p.bet.id)
    byPlayer.set(p.bet.playerId, row)
  }

  return { kind: 'paid', totalPool: pot, payouts: [...byPlayer.values()] }
}
