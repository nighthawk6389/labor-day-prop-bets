import { describe, it, expect } from 'vitest'
import { settle, totalPool, impliedPct, payoutMultiple, type PoolBet, type PoolOutcome } from './parimutuel'

const O: PoolOutcome[] = [
  { id: 1, seedUnits: 25 },
  { id: 2, seedUnits: 25 },
]
const bet = (id: number, playerId: number, outcomeId: number, stake: number, weightBp = 100): PoolBet => ({
  id, playerId, outcomeId, stake, weightBp,
})

/** The books must always balance: everything in the pot goes back out. */
const conserved = (pot: number, payouts: { amount: number }[]) =>
  payouts.reduce((n, p) => n + p.amount, 0) === pot

describe('pool accounting', () => {
  it('counts seeds plus every stake', () => {
    expect(totalPool(O, [bet(1, 1, 1, 100), bet(2, 2, 2, 50)])).toBe(200)
  })

  it('implied odds sum to 1 across outcomes', () => {
    const bets = [bet(1, 1, 1, 100), bet(2, 2, 2, 50)]
    const sum = O.reduce((n, o) => n + impliedPct(o, O, bets), 0)
    expect(sum).toBeCloseTo(1, 10)
  })

  it('quotes a payout multiple against the whole pot', () => {
    const bets = [bet(1, 1, 1, 75)]
    // pot 125, outcome 1 holds 100 -> 1.25x
    expect(payoutMultiple(O[0], O, bets)).toBeCloseTo(1.25, 10)
    // outcome 2 holds only its 25 seed -> 5x
    expect(payoutMultiple(O[1], O, bets)).toBeCloseTo(5, 10)
  })
})

describe('settlement', () => {
  it('splits the pot in proportion to stake', () => {
    const bets = [bet(1, 1, 1, 100), bet(2, 2, 1, 100), bet(3, 3, 2, 200)]
    const s = settle(O, bets, 1)
    expect(s.kind).toBe('paid')
    expect(s.totalPool).toBe(450)
    // Two equal winning stakes split the 450 pot evenly.
    expect(s.payouts.find((p) => p.playerId === 1)!.amount).toBe(225)
    expect(s.payouts.find((p) => p.playerId === 2)!.amount).toBe(225)
    expect(s.payouts.find((p) => p.playerId === 3)).toBeUndefined()
    expect(conserved(s.totalPool, s.payouts)).toBe(true)
  })

  it('pays an early bird more than a late bet of the same size', () => {
    const bets = [bet(1, 1, 1, 100, 125), bet(2, 2, 1, 100, 100), bet(3, 3, 2, 300)]
    const s = settle(O, bets, 1)
    const early = s.payouts.find((p) => p.playerId === 1)!.amount
    const late = s.payouts.find((p) => p.playerId === 2)!.amount
    expect(early).toBeGreaterThan(late)
    expect(conserved(s.totalPool, s.payouts)).toBe(true)
  })

  it('voids and refunds at cost when nobody backed the winner', () => {
    const bets = [bet(1, 1, 1, 100), bet(2, 2, 1, 40)]
    const s = settle(O, bets, 2)
    expect(s.kind).toBe('void')
    expect(s.payouts.find((p) => p.playerId === 1)!.amount).toBe(100)
    expect(s.payouts.find((p) => p.playerId === 2)!.amount).toBe(40)
  })

  it('hands rounding dust to the largest winning stake', () => {
    // Pot 50 seed + 101 = 151, split three uneven ways -> flooring leaves dust.
    const bets = [bet(1, 1, 1, 34), bet(2, 2, 1, 33), bet(3, 3, 1, 34)]
    const s = settle(O, bets, 1)
    expect(conserved(s.totalPool, s.payouts)).toBe(true)
    // Tie on stake breaks to the lowest bet id, so player 1 takes the dust.
    expect(s.payouts.find((p) => p.playerId === 1)!.amount).toBeGreaterThanOrEqual(
      s.payouts.find((p) => p.playerId === 3)!.amount,
    )
  })

  it('conserves the pot across many random boards', () => {
    for (let trial = 0; trial < 300; trial++) {
      const outs: PoolOutcome[] = Array.from({ length: 2 + (trial % 8) }, (_, i) => ({
        id: i + 1,
        seedUnits: 1 + ((trial * 7 + i * 3) % 20),
      }))
      const bets: PoolBet[] = Array.from({ length: 1 + (trial % 12) }, (_, i) => ({
        id: i + 1,
        playerId: 1 + (i % 9),
        outcomeId: outs[(trial + i) % outs.length].id,
        stake: 1 + ((trial * 13 + i * 29) % 200),
        weightBp: i % 3 === 0 ? 125 : 100,
      }))
      const winner = outs[trial % outs.length].id
      const s = settle(outs, bets, winner)
      if (s.kind === 'paid') {
        expect(conserved(s.totalPool, s.payouts)).toBe(true)
      } else {
        // A void returns exactly what players put in, never the house seed.
        const refunded = s.payouts.reduce((n, p) => n + p.amount, 0)
        expect(refunded).toBe(bets.reduce((n, b) => n + b.stake, 0))
      }
      expect(s.payouts.every((p) => p.amount >= 0)).toBe(true)
    }
  })

  it('never pays a single winner more or less than the whole pot', () => {
    const bets = [bet(1, 1, 1, 7, 125), bet(2, 2, 2, 93)]
    const s = settle(O, bets, 1)
    expect(s.payouts).toHaveLength(1)
    expect(s.payouts[0].amount).toBe(s.totalPool)
  })
})
