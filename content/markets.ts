/**
 * The board. Every market is an action or an utterance by a named human —
 * no amenity or trivia bets, which are both unfunny and free money for
 * anyone who reads the Airbnb listing.
 *
 * Edit anything here and re-run `npm run seed` to rebuild an empty board.
 * Once real bets are down, copy changes are safe but changing outcomes or
 * over/under lines is not.
 */

export type MarketKind = 'binary' | 'multi' | 'overunder'

export type MarketCategory =
  | 'headliner'
  | 'h2h'
  | 'chaos'
  | 'catchphrase'
  | 'dadlife'
  | 'meta'
  | 'live'

export type OutcomeSeed = {
  label: string
  /** Opening house units on this outcome. Sets the prior and prevents a divide-by-zero. */
  seed: number
  /** The player this outcome names. They can never bet on themselves. */
  subject?: string
}

export type MarketSeed = {
  slug: string
  title: string
  blurb: string
  category: MarketCategory
  kind: MarketKind
  /** ISO UTC. Betting closes here. */
  locksAt: string
  /** Hide live odds until lock, so the subject can't see they're the favorite and bail. */
  sealed?: boolean
  /** Players barred from this market entirely — the whole thing is about them. */
  blocked?: string[]
  /** Players can file a 📣 claim to resolve it; the commissioner confirms. */
  claimable?: boolean
  outcomes: OutcomeSeed[]
}

export const CATEGORY_LABELS: Record<MarketCategory, string> = {
  headliner: '🔥 The Headliners',
  h2h: '🏆 Head-to-Head',
  chaos: '💥 Chaos & Embarrassment',
  catchphrase: '🗣️ Catchphrases',
  dadlife: '👨‍👩‍👧 Dad Life',
  meta: '🎖️ Meta',
  live: '⚡ Live Drops',
}

const ALL = ['chaim', 'brian', 'yona', 'moshe', 'oren', 'netanel', 'justin', 'mikey', 'ilan']

const NAMES: Record<string, string> = {
  chaim: 'Chaim',
  brian: 'Brian',
  yona: 'Yona',
  moshe: 'Moshe',
  oren: 'Oren',
  netanel: 'Netanel',
  justin: 'Justin',
  mikey: 'Mikey',
  ilan: 'Ilan',
}

/** Every player as an outcome, evenly seeded. */
const everyone = (per = 5, except: string[] = []) =>
  ALL.filter((s) => !except.includes(s)).map((slug) => ({
    label: NAMES[slug],
    seed: per,
    subject: slug,
  }))

export const MARKETS: MarketSeed[] = [
  // ─────────────────────────── 🔥 THE HEADLINERS ───────────────────────────
  {
    slug: 'fox-time',
    title: 'Fox Time',
    blurb:
      '"5 pm fox time is really 7 pm." — Brian. "Facts." — Chaim. "Ollo time works. Fox time does not." How late do the Foxes actually roll in on Thursday, measured against 4pm check-in?',
    category: 'headliner',
    kind: 'multi',
    locksAt: '2026-09-03T20:00:00Z', // Thu 4:00 PM ET — check-in
    blocked: ['moshe'],
    claimable: true,
    outcomes: [
      { label: 'On time or early', seed: 4 },
      { label: 'Under an hour late', seed: 12 },
      { label: '1–2 hours late', seed: 20 },
      { label: '2+ hours late', seed: 14 },
    ],
  },
  {
    slug: 'tent-at-sunrise',
    title: "Who's still in the tent at sunrise?",
    blurb:
      'Chaim is bringing a tent. Mikey is "all in on camping right now." Netanel got assigned to it, and Moshe notes he "only sleeps in hammocks with mosquito nets." Somebody is folding before dawn.',
    category: 'headliner',
    kind: 'multi',
    locksAt: '2026-09-04T02:00:00Z', // Thu 10:00 PM ET
    claimable: true,
    outcomes: [
      { label: 'Chaim', seed: 12, subject: 'chaim' },
      { label: 'Mikey', seed: 10, subject: 'mikey' },
      { label: 'Netanel', seed: 6, subject: 'netanel' },
      { label: 'Someone else entirely', seed: 4 },
      { label: 'Nobody lasts the night', seed: 18 },
    ],
  },
  {
    slug: 'first-to-spark',
    title: 'First to spark a J',
    blurb:
      'Moshe already called it in the chat: "First one to smoke a J put me down for $100 on @Chaim." Odds are sealed until lock so the favorite cannot see himself and refuse out of spite.',
    category: 'headliner',
    kind: 'multi',
    locksAt: '2026-09-03T22:00:00Z', // Thu 6:00 PM ET
    sealed: true,
    claimable: true,
    outcomes: [
      { label: 'Chaim', seed: 16, subject: 'chaim' },
      { label: 'Moshe', seed: 8, subject: 'moshe' },
      { label: 'Yona', seed: 8, subject: 'yona' },
      { label: 'Brian', seed: 6, subject: 'brian' },
      { label: 'Oren', seed: 6, subject: 'oren' },
      { label: 'Someone else', seed: 4 },
      { label: 'Nobody all weekend', seed: 2 },
    ],
  },
  {
    slug: 'aggregation-count',
    title: 'The Aggregation Count',
    blurb:
      '"Let\'s aggregate." "Love a good aggregation." "Nothing gets you going like an aggregated aggregation." How many times does Chaim say some form of the word out loud this weekend?',
    category: 'headliner',
    kind: 'overunder',
    locksAt: '2026-09-03T22:00:00Z',
    blocked: ['chaim'],
    claimable: true,
    outcomes: [
      { label: 'Over 3.5', seed: 28 },
      { label: 'Under 3.5', seed: 22 },
    ],
  },
  {
    slug: 'brisket',
    title: "Does Ilan's brisket actually materialize?",
    blurb:
      'Justin: "I hear @Ilan Elkobi plans to bring one of his famous smoked briskets 🥩." Famous is doing a lot of work in that sentence. Resolves YES only if it arrives smoked and gets served.',
    category: 'headliner',
    kind: 'binary',
    locksAt: '2026-09-03T22:00:00Z',
    blocked: ['ilan'],
    claimable: true,
    outcomes: [
      { label: 'Yes', seed: 30 },
      { label: 'No', seed: 20 },
    ],
  },

  // ─────────────────────────── 🏆 HEAD-TO-HEAD ───────────────────────────
  {
    slug: 'pink-court-open',
    title: 'The Pink Court Open',
    blurb:
      'Yona bought six fresh cans of tennis balls before anyone asked him to. "That pink tennis court is something." Winner of the weekend tournament takes it.',
    category: 'h2h',
    kind: 'multi',
    locksAt: '2026-09-04T14:00:00Z', // Fri 10:00 AM ET
    claimable: true,
    outcomes: [...everyone(5), { label: 'No tournament happens', seed: 8 }],
  },
  {
    slug: 'poker-chip-leader',
    title: 'Poker: chip leader when they call it',
    blurb:
      'There is a real poker table in the house. Whoever is sitting behind the biggest stack when the game breaks up wins this.',
    category: 'h2h',
    kind: 'multi',
    locksAt: '2026-09-05T01:00:00Z', // Fri 9:00 PM ET
    claimable: true,
    outcomes: [...everyone(5), { label: 'No real game happens', seed: 8 }],
  },
  {
    slug: 'chicken-fight',
    title: 'Feder vs. Elkobi chicken fight',
    blurb:
      'Yona called it the "highly anticipated matchup" and then said he would "definitely gamble on that." One market, not two — a separate "does it happen" bet would just be free hedging.',
    category: 'h2h',
    kind: 'multi',
    locksAt: '2026-09-04T16:00:00Z', // Fri 12:00 PM ET
    claimable: true,
    outcomes: [
      { label: 'Feder', seed: 15, subject: 'oren' },
      { label: 'Elkobi', seed: 15, subject: 'ilan' },
      { label: 'Someone else wins it', seed: 5 },
      { label: 'Never happens', seed: 15 },
    ],
  },

  // ────────────────────── 💥 CHAOS & EMBARRASSMENT ──────────────────────
  {
    slug: 'first-to-need-ice',
    title: 'First to need ice',
    blurb:
      'Matkot, Polish horseshoes, a chicken fight, and a basketball nobody has confirmed exists. Someone is getting a bag of frozen peas held to something.',
    category: 'chaos',
    kind: 'multi',
    locksAt: '2026-09-03T22:00:00Z',
    sealed: true,
    claimable: true,
    outcomes: [...everyone(4), { label: 'Clean weekend, nobody hurt', seed: 14 }],
  },
  {
    slug: 'lost-for-an-hour',
    title: 'Who loses a phone, keys, or wallet for an hour?',
    blurb:
      'Thirty people, fourteen of them children, one very large house. Resolves on the first item genuinely missing for sixty minutes — a search party counts, patting your pocket does not.',
    category: 'chaos',
    kind: 'multi',
    locksAt: '2026-09-03T22:00:00Z',
    claimable: true,
    outcomes: [...everyone(4), { label: 'Nobody loses anything', seed: 14 }],
  },

  // ─────────────────────────── 🗣️ CATCHPHRASES ───────────────────────────
  {
    slug: 'every-year',
    title: '"We should do this every year"',
    blurb:
      'Somebody says it on a porch at some point, usually more than once, usually to nodding. Count every distinct time it gets said out loud.',
    category: 'catchphrase',
    kind: 'overunder',
    locksAt: '2026-09-03T22:00:00Z',
    claimable: true,
    outcomes: [
      { label: 'Over 4.5', seed: 26 },
      { label: 'Under 4.5', seed: 24 },
    ],
  },
  {
    slug: 'netanel-roast',
    title: 'Who gets roasted by Netanel first?',
    blurb:
      'His entire contribution to a serious conversation about whether dogs were welcome was the single word "Racist." Sealed, because he is absolutely capable of reading the odds and picking differently.',
    category: 'catchphrase',
    kind: 'multi',
    locksAt: '2026-09-03T22:00:00Z',
    sealed: true,
    blocked: ['netanel'],
    claimable: true,
    outcomes: everyone(6, ['netanel']),
  },

  // ─────────────────────────── 👨‍👩‍👧 DAD LIFE ───────────────────────────
  {
    slug: 'first-asleep',
    title: 'First dad asleep on a couch before 11pm',
    blurb:
      'Two hour drive, a full day of sun, and a beer. One of you is not making it to the poker game. Sealed so nobody fights their own eyelids for money.',
    category: 'dadlife',
    kind: 'multi',
    locksAt: '2026-09-04T00:00:00Z', // Thu 8:00 PM ET
    sealed: true,
    claimable: true,
    outcomes: [...everyone(4), { label: 'Everyone makes it to midnight', seed: 14 }],
  },
  {
    slug: 'bedtime-duty',
    title: "Who's on bedtime duty when the poker game starts?",
    blurb:
      'The chips come out, the table fills up, and exactly one guy is upstairs negotiating with a four-year-old. Resolves to whoever misses the first hand.',
    category: 'dadlife',
    kind: 'multi',
    locksAt: '2026-09-05T00:00:00Z', // Fri 8:00 PM ET
    claimable: true,
    outcomes: [...everyone(5), { label: 'Nobody — game starts late', seed: 8 }],
  },

  // ─────────────────────────────── 🎖️ META ───────────────────────────────
  {
    slug: 'exchange-champion',
    title: 'Who wins the Frutchey Exchange?',
    blurb:
      'Futures on the final leaderboard. Locks Thursday night, so you are betting on the field before a single market has resolved.',
    category: 'meta',
    kind: 'multi',
    locksAt: '2026-09-04T03:00:00Z', // Thu 11:00 PM ET
    outcomes: everyone(6),
  },
]
