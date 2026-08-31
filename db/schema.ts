import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull().default('🎲'),
  pinHash: text('pin_hash').notNull(),
  isCommissioner: boolean('is_commissioner').notNull().default(false),
})

export const markets = pgTable('markets', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  blurb: text('blurb').notNull().default(''),
  category: text('category').notNull(),
  kind: text('kind').notNull(),
  /** open | locked | resolved | void */
  status: text('status').notNull().default('open'),
  locksAt: timestamp('locks_at', { withTimezone: true }).notNull(),
  sealed: boolean('sealed').notNull().default(false),
  claimable: boolean('claimable').notNull().default(false),
  /** Player slugs barred from the market entirely. */
  blocked: text('blocked').array().notNull().default([]),
  maxStake: integer('max_stake').notNull(),
  sort: integer('sort').notNull().default(0),
  resolvedOutcomeId: integer('resolved_outcome_id'),
  resolutionNote: text('resolution_note'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
})

export const outcomes = pgTable(
  'outcomes',
  {
    id: serial('id').primaryKey(),
    marketId: integer('market_id')
      .notNull()
      .references(() => markets.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    /** House units opening this outcome. Sets the prior, prevents divide-by-zero. */
    seedUnits: integer('seed_units').notNull().default(0),
    /** The player this outcome names — they can never bet on themselves. */
    subjectSlug: text('subject_slug'),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('outcomes_market_idx').on(t.marketId)],
)

/** Immutable once written. No cash-out, no resale — that is the anti-arb core. */
export const bets = pgTable(
  'bets',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id')
      .notNull()
      .references(() => players.id),
    marketId: integer('market_id')
      .notNull()
      .references(() => markets.id, { onDelete: 'cascade' }),
    outcomeId: integer('outcome_id')
      .notNull()
      .references(() => outcomes.id, { onDelete: 'cascade' }),
    stake: integer('stake').notNull(),
    /** Basis points of 100. 125 = early-bird 1.25x. */
    weightBp: integer('weight_bp').notNull().default(100),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('bets_market_idx').on(t.marketId),
    index('bets_player_idx').on(t.playerId),
  ],
)

/** Anyone files, the commissioner confirms. */
export const claims = pgTable(
  'claims',
  {
    id: serial('id').primaryKey(),
    marketId: integer('market_id')
      .notNull()
      .references(() => markets.id, { onDelete: 'cascade' }),
    claimantId: integer('claimant_id')
      .notNull()
      .references(() => players.id),
    outcomeId: integer('outcome_id')
      .notNull()
      .references(() => outcomes.id, { onDelete: 'cascade' }),
    quote: text('quote').notNull().default(''),
    /** pending | approved | rejected */
    status: text('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('claims_market_idx').on(t.marketId)],
)

/** Append-only. Balance is always SUM(delta) — one source of truth, no drift. */
export const ledger = pgTable(
  'ledger',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id')
      .notNull()
      .references(() => players.id),
    delta: integer('delta').notNull(),
    /** grant | bet | payout | refund | finders_fee */
    reason: text('reason').notNull(),
    ref: text('ref'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ledger_player_idx').on(t.playerId)],
)

/** Single-row table holding board-wide state. */
export const boardState = pgTable('board_state', {
  id: integer('id').primaryKey().default(1),
  weekendClosed: boolean('weekend_closed').notNull().default(false),
})
