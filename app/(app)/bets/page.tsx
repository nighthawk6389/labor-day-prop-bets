import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { myBets } from '@/lib/board'
import { money, whenET } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function MyBetsPage() {
  const session = (await getSession())!
  const rows = await myBets(session.playerId)

  const staked = rows.reduce((n, b) => n + b.stake, 0)
  const live = rows.filter((b) => b.marketStatus === 'open' || b.marketStatus === 'locked')

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">🎟️ My Bets</h1>
        <p className="mt-1 text-sm text-mute">
          {rows.length} placed · {money(staked)} staked all-time · {live.length} still live
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-mute">
          Nothing down yet.{' '}
          <Link href="/" className="text-court">
            Go find a market →
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((b) => {
            const settled = b.marketStatus === 'resolved'
            const won = settled && b.resolvedOutcomeId === b.outcomeId
            return (
              <li key={b.id} className="rounded-xl border border-line bg-panel p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/m/${b.marketSlug}`} className="text-sm font-semibold">
                    {b.marketTitle}
                  </Link>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {money(b.stake)}
                    {b.weightBp > 100 && <span className="ml-1 text-[10px] text-up">🐦</span>}
                  </span>
                </div>
                <p className="mt-1 text-sm text-mute">→ {b.outcomeLabel}</p>
                <p className="mt-1.5 text-[11px] text-mute">
                  {whenET(b.createdAt)}
                  {settled && (
                    <span className={won ? 'ml-2 text-up' : 'ml-2 text-down'}>
                      {won ? '✅ won' : '✗ lost'}
                    </span>
                  )}
                  {b.marketStatus === 'void' && <span className="ml-2">↩︎ refunded</span>}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
