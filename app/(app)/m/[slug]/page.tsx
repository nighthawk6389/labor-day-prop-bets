import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getBalance, getMarket, getPlayers, stakeInMarket } from '@/lib/board'
import { OutcomeBar } from '@/components/OutcomeBar'
import { CountdownChip } from '@/components/CountdownChip'
import { BetPanel } from '@/components/BetPanel'
import { ClaimPanel } from '@/components/ClaimPanel'
import { CATEGORY_LABELS, type MarketCategory } from '@/content/markets'
import { isEarlyBird, money, whenET } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function MarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ o?: string }>
}) {
  const { slug } = await params
  const { o } = await searchParams
  const session = (await getSession())!

  const found = await getMarket(slug)
  if (!found) notFound()
  const { view: m, bets } = found

  const [balance, alreadyIn, roster] = await Promise.all([
    getBalance(session.playerId),
    stakeInMarket(session.playerId, m.id),
    getPlayers(),
  ])

  const blocked = m.blocked.includes(session.slug)
  const nameOf = (id: number) => roster.find((p) => p.id === id)
  const labelOf = (id: number) => m.outcomes.find((x) => x.id === id)?.label ?? '—'

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-block text-sm text-mute">
        ← Markets
      </Link>

      <header>
        <div className="mb-1.5 flex items-center gap-2 text-[11px] text-mute">
          <span>{CATEGORY_LABELS[m.category as MarketCategory] ?? m.category}</span>
          <CountdownChip locksAt={m.locksAt} status={m.status} live={m.category === 'live'} />
        </div>
        <h1 className="text-xl leading-snug font-bold">{m.title}</h1>
        {m.blurb && <p className="mt-2 text-sm leading-relaxed text-mute">{m.blurb}</p>}
        <p className="mt-2.5 text-[11px] text-mute">
          Pot {money(m.totalPool)} · closes {whenET(m.locksAt)}
          {m.sealed && ' · 🔒 odds sealed until close'}
        </p>
      </header>

      <div className="space-y-1.5">
        {m.outcomes.map((oc) => (
          <OutcomeBar
            key={oc.id}
            outcome={oc}
            revealed={m.revealed}
            self={oc.subjectSlug === session.slug}
            won={m.resolvedOutcomeId === oc.id}
          />
        ))}
      </div>

      {m.resolutionNote && (
        <p className="rounded-xl border border-line bg-panel p-3 text-sm text-mute">
          <strong className="text-fg">Result:</strong> {m.resolutionNote}
        </p>
      )}

      {m.open && !blocked && (
        <BetPanel
          marketId={m.id}
          outcomes={m.outcomes.map((x) => ({
            id: x.id,
            label: x.label,
            subjectSlug: x.subjectSlug,
          }))}
          preselect={o ? Number(o) : undefined}
          balance={balance}
          alreadyIn={alreadyIn}
          maxStake={m.maxStake}
          mySlug={session.slug}
          earlyBird={isEarlyBird()}
        />
      )}

      {blocked && (
        <p className="rounded-xl border border-line bg-panel p-3 text-sm text-mute">
          This market is about you, so you're sitting it out. That's the rule that keeps it
          honest.
        </p>
      )}

      {m.claimable && m.status === 'open' && (
        <ClaimPanel
          marketId={m.id}
          outcomes={m.outcomes.map((x) => ({ id: x.id, label: x.label }))}
        />
      )}

      {/* Positions stay hidden until close, so nobody gets targeted mid-market. */}
      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wide text-mute uppercase">
          Positions {!m.revealed && '(revealed at close)'}
        </h2>
        {!m.revealed ? (
          <p className="rounded-xl border border-line bg-panel p-3 text-sm text-mute">
            🔒 {bets.length} {bets.length === 1 ? 'bet' : 'bets'} down. Who backed what stays
            hidden until this closes.
          </p>
        ) : bets.length === 0 ? (
          <p className="rounded-xl border border-line bg-panel p-3 text-sm text-mute">
            Nobody has bet yet.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel text-sm">
            {bets.map((b) => {
              const p = nameOf(b.playerId)
              return (
                <li key={b.id} className="flex items-center justify-between px-3 py-2">
                  <span className="truncate">
                    {p?.emoji} {p?.name}
                    <span className="ml-1.5 text-mute">→ {labelOf(b.outcomeId)}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {money(b.stake)}
                    {b.weightBp > 100 && <span className="ml-1 text-[10px] text-up">🐦</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
