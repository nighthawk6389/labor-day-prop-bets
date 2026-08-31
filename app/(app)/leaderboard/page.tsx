import { getLeaderboard, isWeekendClosed } from '@/lib/board'
import { money } from '@/lib/format'
import { CONFIG } from '@/content/config'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const [rows, closed] = await Promise.all([getLeaderboard(), isWeekendClosed()])
  const pot = CONFIG.buyInUsd * rows.length

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold">🏆 The Board</h1>
        <p className="mt-1 text-sm text-mute">
          Ranked by bankroll — cash plus whatever is still riding.
        </p>
      </header>

      <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="w-5 shrink-0 text-center text-sm text-mute tabular-nums">
              {i === 0 ? '👑' : i + 1}
            </span>
            <span className="text-xl">{r.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{r.name}</span>
              <span className="block text-[11px] text-mute tabular-nums">
                {money(r.cash)} cash · {money(r.atRisk)} riding
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-semibold tabular-nums">{money(r.bankroll)}</span>
              <span
                className={`block text-[11px] tabular-nums ${
                  r.realized > 0 ? 'text-up' : r.realized < 0 ? 'text-down' : 'text-mute'
                }`}
              >
                {r.realized > 0 ? '+' : ''}
                {r.realized}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {closed ? (
        <section className="rounded-xl border border-court/40 bg-court/10 p-3.5">
          <h2 className="mb-1 text-sm font-semibold">💵 Settle up</h2>
          <p className="mb-3 text-[11px] text-mute">
            ${CONFIG.buyInUsd} a man · ${pot} pot · paid {CONFIG.payoutSplit.map((s) => `${s * 100}%`).join(' / ')}
          </p>
          <ul className="space-y-1.5">
            {rows.slice(0, CONFIG.payoutSplit.length).map((r, i) => (
              <li key={r.id} className="flex justify-between text-sm">
                <span>
                  {['🥇', '🥈', '🥉'][i]} {r.name}
                </span>
                <span className="font-semibold tabular-nums">
                  ${Math.round(pot * CONFIG.payoutSplit[i])}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-center text-[11px] text-mute">
          Settle-up appears once Ilan closes the weekend.
        </p>
      )}
    </div>
  )
}
