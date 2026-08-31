import { getClaims } from '@/lib/board'
import { whenET } from '@/lib/format'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const BADGE: Record<string, string> = {
  pending: 'bg-court/20 text-court',
  approved: 'bg-up/15 text-up',
  rejected: 'bg-panel-2 text-mute',
}

export default async function ClaimsPage() {
  const rows = await getClaims()

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">📣 Claims</h1>
        <p className="mt-1 text-sm text-mute">
          Anyone can file. Ilan confirms. Whoever files the claim that settles a market
          collects the finder's fee.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-mute">
          Nothing claimed yet. Start listening.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-panel p-3">
              <div className="mb-1 flex items-start justify-between gap-2">
                <Link href={`/m/${c.marketSlug}`} className="text-sm font-semibold">
                  {c.marketTitle}
                </Link>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${BADGE[c.status]}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-sm">
                <span className="text-mute">→</span> {c.outcomeLabel}
              </p>
              {c.quote && <p className="mt-1.5 text-sm text-mute italic">"{c.quote}"</p>}
              <p className="mt-1.5 text-[11px] text-mute">
                {c.claimantEmoji} {c.claimant} · {whenET(c.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
