import Link from 'next/link'
import { multiple, pct } from '@/lib/format'
import type { OutcomeView } from '@/lib/board'

type Props = {
  outcome: OutcomeView
  href?: string
  revealed: boolean
  /** Dim and disable — this outcome is the viewer, and nobody bets on themselves. */
  self?: boolean
  won?: boolean
}

export function OutcomeBar({ outcome, href, revealed, self, won }: Props) {
  const width = revealed ? Math.max(outcome.pct * 100, 1.5) : 0

  const inner = (
    <div
      className={`relative overflow-hidden rounded-lg border px-3 py-2.5 ${
        won ? 'border-up/60 bg-up/10' : 'border-line bg-panel-2'
      } ${self ? 'opacity-40' : ''}`}
    >
      {revealed && (
        <div
          className="absolute inset-y-0 left-0 bg-court/15"
          style={{ width: `${width}%` }}
          aria-hidden
        />
      )}
      <div className="relative flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium">
          {won && '✅ '}
          {outcome.label}
          {self && <span className="ml-1 text-[10px] text-mute">(you)</span>}
        </span>
        <span className="shrink-0 text-right">
          {revealed ? (
            <>
              <span className="text-sm font-semibold tabular-nums">{pct(outcome.pct)}</span>
              <span className="ml-2 text-[11px] text-mute tabular-nums">
                {multiple(outcome.multiple)}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-mute">🔒 sealed</span>
          )}
        </span>
      </div>
    </div>
  )

  if (!href || self) return inner
  return (
    <Link href={href} className="block active:opacity-70">
      {inner}
    </Link>
  )
}
