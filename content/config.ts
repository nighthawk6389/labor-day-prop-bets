/**
 * House rules. Everything here is safe to tweak before the board goes live.
 * Changing bankroll or caps after real bets are down will not retroactively
 * rewrite history — the ledger is the source of truth.
 */
export const CONFIG = {
  /** Display symbol and name for the play-money currency. */
  currency: '₣',
  currencyName: 'Frutchey Bucks',

  /** What everyone starts with. */
  startingBankroll: 1000,

  /** Nobody can put more than this into any single market. */
  maxStakePerMarket: 200,

  /**
   * Bets placed before check-in count for extra when the pot is split.
   * Stored as basis points of 100, so 125 = 1.25x.
   */
  earlyBirdUntil: '2026-09-03T20:00:00Z', // Thu Sep 3, 4:00 PM ET — check-in
  earlyBirdWeightBp: 125,
  normalWeightBp: 100,

  /** Paid to whoever files the claim that resolves a market. */
  findersFee: 25,

  /** Optional real-dollar settle-up, shown once the commissioner closes the weekend. */
  buyInUsd: 20,
  payoutSplit: [0.5, 0.3, 0.2],

  timezone: 'America/New_York',

  weekend: {
    checkIn: '2026-09-03T20:00:00Z',  // Thu Sep 3, 4:00 PM ET
    checkOut: '2026-09-07T15:00:00Z', // Mon Sep 7, 11:00 AM ET
  },
} as const
