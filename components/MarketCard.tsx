import Link from 'next/link'
import { OutcomeBar } from './OutcomeBar'
import { CountdownChip } from './CountdownChip'
import { money } from '@/lib/format'
import type { MarketView } from '@/lib/board'

export function MarketCard({ m, mySlug }: { m: MarketView; mySlug: string }) {
  const blockedFromMarket = m.blocked.includes(mySlug)
  // Long multi-outcome markets get truncated on the feed; the detail page has them all.
  const shown = m.outcomes.slice(0, 5)
  const hidden = m.outcomes.length - shown.length

  return (
    <article className="rounded-xl border border-line bg-panel p-3.5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {m.sealed && !m.revealed && (
            <div className="mb-1 text-[11px] text-mute">🔒 odds sealed until close</div>
          )}
          <Link href={`/m/${m.slug}`} className="block">
            <h2 className="text-[15px] leading-snug font-semibold">{m.title}</h2>
          </Link>
        </div>
        <CountdownChip locksAt={m.locksAt} status={m.status} live={m.category === 'live'} />
      </div>

      <div className="space-y-1.5">
        {shown.map((o) => (
          <OutcomeBar
            key={o.id}
            outcome={o}
            revealed={m.revealed}
            self={o.subjectSlug === mySlug}
            won={m.resolvedOutcomeId === o.id}
            href={m.open && !blockedFromMarket ? `/m/${m.slug}?o=${o.id}` : `/m/${m.slug}`}
          />
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-mute">
        <span>Pot {money(m.totalPool)}</span>
        <Link href={`/m/${m.slug}`} className="text-court">
          {hidden > 0 ? `+${hidden} more →` : 'Details →'}
        </Link>
      </div>

      {blockedFromMarket && m.open && (
        <p className="mt-2 rounded-lg bg-panel-2 px-2.5 py-1.5 text-[11px] text-mute">
          This one is about you. Sit it out.
        </p>
      )}
    </article>
  )
}
