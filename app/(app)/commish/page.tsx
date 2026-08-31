import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getBoard, getClaims, isWeekendClosed } from '@/lib/board'
import { CommishTools } from './CommishTools'

export const dynamic = 'force-dynamic'

export default async function CommishPage() {
  const session = await getSession()
  if (!session?.commissioner) redirect('/')

  const [board, claims, closed] = await Promise.all([getBoard(), getClaims(), isWeekendClosed()])
  const pending = claims.filter((c) => c.status === 'pending')

  return (
    <CommishTools
      pending={pending.map((c) => ({
        id: c.id,
        marketTitle: c.marketTitle,
        outcomeLabel: c.outcomeLabel,
        quote: c.quote,
        claimant: `${c.claimantEmoji} ${c.claimant}`,
      }))}
      markets={board
        .filter((m) => m.status === 'open' || m.status === 'locked')
        .map((m) => ({
          id: m.id,
          title: m.title,
          open: m.open,
          outcomes: m.outcomes.map((o) => ({ id: o.id, label: o.label })),
        }))}
      weekendClosed={closed}
    />
  )
}
