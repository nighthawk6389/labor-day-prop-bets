import { getSession } from '@/lib/auth'
import { getBoard } from '@/lib/board'
import { MarketCard } from '@/components/MarketCard'
import { CATEGORY_LABELS, type MarketCategory } from '@/content/markets'
import { isEarlyBird } from '@/lib/format'
import { CONFIG } from '@/content/config'

export const dynamic = 'force-dynamic'

const ORDER: MarketCategory[] = [
  'live',
  'headliner',
  'h2h',
  'chaos',
  'catchphrase',
  'dadlife',
  'meta',
]

export default async function FeedPage() {
  const session = (await getSession())!
  const board = await getBoard()

  const open = board.filter((m) => m.status === 'open')
  const settled = board.filter((m) => m.status !== 'open')

  const groups = ORDER.map((cat) => ({
    cat,
    markets: open.filter((m) => m.category === cat),
  })).filter((g) => g.markets.length > 0)

  return (
    <div className="space-y-6">
      {isEarlyBird() && (
        <div className="rounded-xl border border-up/30 bg-up/10 p-3 text-sm">
          <strong className="text-up">🐦 Early bird is live.</strong>{' '}
          <span className="text-mute">
            Every bet placed before Thursday 4pm check-in counts{' '}
            {CONFIG.earlyBirdWeightBp / 100}× when the pot is split.
          </span>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.cat}>
          <h2 className="mb-2.5 text-xs font-medium tracking-wide text-mute uppercase">
            {CATEGORY_LABELS[g.cat]}
          </h2>
          <div className="space-y-2.5">
            {g.markets.map((m) => (
              <MarketCard key={m.id} m={m} mySlug={session.slug} />
            ))}
          </div>
        </section>
      ))}

      {settled.length > 0 && (
        <section>
          <h2 className="mb-2.5 text-xs font-medium tracking-wide text-mute uppercase">
            Settled
          </h2>
          <div className="space-y-2.5">
            {settled.map((m) => (
              <MarketCard key={m.id} m={m} mySlug={session.slug} />
            ))}
          </div>
        </section>
      )}

      {board.length === 0 && (
        <p className="py-16 text-center text-sm text-mute">
          No markets yet. Run <code className="text-court">npm run seed</code>.
        </p>
      )}
    </div>
  )
}
