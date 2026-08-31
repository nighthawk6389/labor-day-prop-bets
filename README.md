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

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. In the project, **Storage → Create Database → Postgres** (Neon). Vercel injects
   `DATABASE_URL` automatically.
4. Add one more env var: `AUTH_SECRET` — any long random string.
   Generate one with `openssl rand -base64 32`.
5. Deploy. Then push the schema and seed the board:

   ```bash
   export DATABASE_URL="<the connection string from Vercel>"
   npm run db:push
   npm run seed
   ```

   The seed prints everyone's 4-digit PIN **once**. Text them out — they are hashed in the
   database and can't be recovered. Re-run with `npm run seed -- --new-pins` to reissue.

### Local

```bash
npm install
cp .env.example .env      # point DATABASE_URL at any Postgres
npm run db:push
npm run seed
npm run dev
```

---

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

Covers the pool math in `lib/parimutuel.ts` — proportional splits, early-bird weighting,
zero-winner voids, integer rounding, and a 300-board fuzz test asserting the pot is always
conserved to the unit.
