'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { placeBet } from '@/app/actions/bet'
import { CONFIG } from '@/content/config'

type Outcome = { id: number; label: string; subjectSlug: string | null }

export function BetPanel({
  marketId,
  outcomes,
  preselect,
  balance,
  alreadyIn,
  maxStake,
  mySlug,
  earlyBird,
}: {
  marketId: number
  outcomes: Outcome[]
  preselect?: number
  balance: number
  alreadyIn: number
  maxStake: number
  mySlug: string
  earlyBird: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [outcomeId, setOutcomeId] = useState<number | undefined>(preselect)
  const [stake, setStake] = useState(25)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const roomLeft = Math.max(0, maxStake - alreadyIn)
  const ceiling = Math.min(balance, roomLeft)
  const chips = [10, 25, 50, 100].filter((c) => c <= ceiling)
  const selected = outcomes.find((o) => o.id === outcomeId)
  const isSelf = selected?.subjectSlug === mySlug

  if (ceiling <= 0) {
    return (
      <p className="rounded-xl border border-line bg-panel p-3 text-sm text-mute">
        {balance <= 0
          ? 'Your bankroll is empty. Wait for a market to settle.'
          : `You are at the ${CONFIG.currency}${maxStake} cap on this market.`}
      </p>
    )
  }

  function submit() {
    if (!outcomeId) return setError('Pick an outcome.')
    if (isSelf) return setError('You cannot bet on yourself.')
    const amount = Math.min(stake, ceiling)
    setError(null)
    start(async () => {
      const res = await placeBet(marketId, outcomeId!, amount)
      if (res.ok) {
        setDone(true)
        router.refresh()
        setTimeout(() => setDone(false), 2500)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-3.5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Place a bet</h3>
        <span className="text-[11px] text-mute tabular-nums">
          {CONFIG.currency}
          {balance.toLocaleString()} available
        </span>
      </div>

      <div className="mb-3 grid gap-1.5">
        {outcomes.map((o) => {
          const mine = o.subjectSlug === mySlug
          return (
            <button
              key={o.id}
              type="button"
              disabled={mine}
              onClick={() => {
                setOutcomeId(o.id)
                setError(null)
              }}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                outcomeId === o.id
                  ? 'border-court bg-court/15 font-semibold'
                  : 'border-line bg-panel-2'
              } ${mine ? 'cursor-not-allowed opacity-40' : 'active:opacity-70'}`}
            >
              {o.label}
              {mine && <span className="ml-1.5 text-[10px] text-mute">— can't bet on yourself</span>}
            </button>
          )
        })}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setStake(c)}
            className={`rounded-lg border px-3 py-1.5 text-sm tabular-nums ${
              stake === c ? 'border-court bg-court/15 font-semibold' : 'border-line bg-panel-2'
            }`}
          >
            {CONFIG.currency}
            {c}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStake(ceiling)}
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            stake === ceiling ? 'border-court bg-court/15 font-semibold' : 'border-line bg-panel-2'
          }`}
        >
          Max {CONFIG.currency}
          {ceiling}
        </button>
      </div>

      {earlyBird && (
        <p className="mb-2.5 rounded-lg bg-up/10 px-2.5 py-1.5 text-[11px] text-up">
          🐦 Early bird — this bet counts {CONFIG.earlyBirdWeightBp / 100}× when the pot is split.
        </p>
      )}

      {error && (
        <p className="mb-2.5 rounded-lg bg-down/10 px-2.5 py-1.5 text-[11px] text-down">{error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !outcomeId || isSelf}
        className="w-full rounded-lg bg-court py-2.5 text-sm font-semibold text-ink disabled:opacity-40"
      >
        {done
          ? '✅ Bet placed'
          : pending
            ? 'Placing…'
            : `Confirm ${CONFIG.currency}${Math.min(stake, ceiling)}`}
      </button>

      <p className="mt-2 text-center text-[10px] text-mute">
        Bets are final. No cash-out, no resale — that's what keeps this un-arbitrageable.
      </p>
    </div>
  )
}
