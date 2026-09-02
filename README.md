# The Frutchey Exchange

A Polymarket-style prop betting board for Labor Day weekend at 148 Frutchey Drive,
East Stroudsburg. Nine guys, fifteen markets, play money, and a commissioner.

Built for phones on bad Poconos cell service: server-rendered, light, two taps to a bet.

---

## Why it can't be gamed

The whole thing is **parimutuel**, not fixed-odds. Every stake goes into one pot per
market and winners split it in proportion to their stake. There is no posted price, so
there is nothing to arbitrage — the odds you see are just a live readout of where the
money currently sits.

On top of that:

| Rule | What it stops |
|---|---|
| **No cash-out, no resale** | Every hedging and secondary-market exploit |
| **Preset markets only** | Someone inventing a market they already know the answer to |
| **Nobody bets on themselves** | Chaim taking the other side of "Chaim sparks the first J" |
| **Subject lock** | Moshe betting on how late the Foxes are |
| **Sealed odds** | The favorite seeing he's the favorite and bailing out of spite |
| **₣200 cap per market** | One whale dragging a pool |
| **Early-bird ×1.25** | Parimutuel's built-in reward for betting last |
| **House seed (~₣50)** | Divide-by-zero on an unbacked outcome, and cheap manipulation |
| **No nested markets** | Free hedging between "does X happen" and "who does X" |

Two more that are slate-design, not code: no market duplicates another's information, and
**no market the Airbnb listing already answers** — those are free money for whoever opens
the link.

## The "said it" mechanic

Most of the card is about what people do and say, so resolution can't be one guy's memory.

1. Anyone taps **📣 Claim it** on a market, picks what happened, and types the quote
2. The claim lands in a public pending feed
3. The commissioner approves or rejects — approving settles the market and pays out
4. Whoever filed the winning claim collects a **₣25 finder's fee**

Anyone can file, one person rules. It makes everyone actually listen all weekend.

---

## Deploy

The build sets up its own database. Push to GitHub, import to Vercel, and the first deploy
migrates the schema and seeds the board — no connection string, no local terminal.

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Connect Postgres. **Storage → Create Database** (or link an existing Supabase/Neon
   project). The integration injects the connection strings.
3. Add one env var of your own: `AUTH_SECRET` — any long random string.
   `openssl rand -base64 32` produces one.
4. Deploy.

`vercel-build` runs `db/deploy.ts` before `next build`, which applies migrations and seeds
the board. Vercel prefers `vercel-build` over `build`, so a local `npm run build` stays
database-free.

### Connection strings

Managed Postgres hands out two URLs and **they are not interchangeable**:

| Variable | Port | Used for |
|---|---|---|
| `POSTGRES_URL` | `:6543` transaction pooler | Runtime. Serverless opens many short connections |
| `POSTGRES_URL_NON_POOLING` | `:5432` session mode | Migrations. DDL through a transaction pooler fails |

`DATABASE_URL` / `DATABASE_URL_UNPOOLED` work as aliases. Two consequences are handled in
`lib/dbUrl.ts` and worth knowing before debugging anything:

- Transaction-mode poolers **do not support prepared statements**, which postgres.js opens
  by default. The client passes `prepare: false` on a pooled URL. Without it the app
  connects fine and then fails on real queries.
- Supabase's session-mode host also contains the word "pooler"
  (`aws-1-...pooler.supabase.com:5432`). The detection deliberately matches `-pooler.` with
  a hyphen so Neon's pooled endpoint is caught while Supabase's session URL is not.
  Loosening it would silently disable prepared statements everywhere.

### The reseed guard

Seeding wipes the ledger, so running it on every deploy would erase everyone's bets. The
deploy script **seeds only when no bets exist yet**:

- **Before anyone bets** — every deploy reseeds. Edit `content/markets.ts`, push, and the
  new card is live. Tune freely.
- **After the first real bet** — seeding is skipped and the board is left alone. It freezes
  itself at exactly the right moment.
- `FORCE_RESEED=1` overrides it for a deliberate wipe.

## Login codes

Two digits each, in `content/players.ts`. Text them out.

| | | |
|---|---|---|
| Ilan Elkobi **47** | Chaim **82** | Brian Wiener **19** |
| Yona **63** | Moshe Fox **58** | Oren Feder **91** |
| Netanel Heiser **36** | Justin **74** | Mikey **25** |

Change one and redeploy and it applies — as long as nobody has bet yet. Two digits is 100
combinations, so this keeps honest men honest and no more; it is play money on a private
URL.

### Local

```bash
npm install
cp .env.example .env      # point DATABASE_URL at any Postgres
npm run db:deploy         # migrate + seed, same as the build hook
npm run dev
```

`npm run seed` also exists and rebuilds the board unconditionally, ignoring the guard.

## The card

**🔥 Headliners** — Fox Time · Who's still in the tent at sunrise · First to spark a J ·
The Aggregation Count · Does Ilan's brisket materialize
**🏆 Head-to-Head** — The Pink Court Open · Poker chip leader · Feder vs. Elkobi chicken fight
**💥 Chaos** — First to need ice · Who loses a phone, keys, or wallet for an hour
**🗣️ Catchphrases** — "We should do this every year" · Who gets roasted by Netanel first
**👨‍👩‍👧 Dad Life** — First dad asleep on a couch · Bedtime duty when poker starts
**🎖️ Meta** — Who wins the Frutchey Exchange

Plus **⚡ live drops**: the commissioner pushes ad-hoc markets that close in twenty minutes
(*"Do the burgers burn?"*). They pin to the top of the feed and are what keeps the app open
all weekend.

## Tuning the card

Everything is data. No code changes, no migration:

| File | Holds |
|---|---|
| `content/markets.ts` | Titles, blurbs, outcomes, over/under lines, lock times, seeds |
| `content/players.ts` | Names, emoji, who's commissioner |
| `content/config.ts` | Bankroll, per-market cap, early-bird window, finder's fee, buy-in |

Re-run `npm run seed` to rebuild an empty board. **Do this before Thursday 4pm** — once
real bets are down, editing copy is safe but changing outcomes or lines is not.

## Commissioner

Ilan. The **⚖️ Commish** tab only appears for him. From it he can confirm claims, settle a
market by hand, void one (refunds every stake at cost), push a live drop, and close the
weekend — which reveals the real-dollar settle-up on the leaderboard.

Settlement is idempotent: the market row is locked and its status re-checked inside the
transaction, so a double tap can't pay twice.

## Money

Play money — ₣1,000 Frutchey Bucks each. The optional real-dollar layer is a flat
`buyInUsd` per man, paid out 50/30/20 to the top three when the weekend closes. The site
never touches payments; it just does the math.

## Tests

```bash
npm test
```

17 tests. `lib/parimutuel.ts` covers the pool math — proportional splits, early-bird
weighting, zero-winner voids, integer rounding, and a 300-board fuzz test asserting the pot
is always conserved to the unit. `lib/dbUrl.ts` covers connection-string resolution against
the real URL shapes Supabase and Neon hand out, including the pooled/session distinction
that decides whether prepared statements are safe.
