'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { fileClaim } from '@/app/actions/bet'
import { CONFIG } from '@/content/config'

export function ClaimPanel({
  marketId,
  outcomes,
}: {
  marketId: number
  outcomes: { id: number; label: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [outcomeId, setOutcomeId] = useState<number | undefined>()
  const [quote, setQuote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [pending, start] = useTransition()

  if (sent) {
    return (
      <p className="rounded-xl border border-up/30 bg-up/10 p-3 text-sm text-up">
        📣 Claim filed. Ilan confirms it, then the market pays.
      </p>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-line bg-panel py-2.5 text-sm font-medium active:opacity-70"
      >
        📣 Claim it — it happened
      </button>
    )
  }

  function submit() {
    if (!outcomeId) return setError('Pick what happened.')
    setError(null)
    start(async () => {
      const res = await fileClaim(marketId, outcomeId!, quote)
      if (res.ok) {
        setSent(true)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-3.5">
      <h3 className="mb-1 text-sm font-semibold">📣 Claim it</h3>
      <p className="mb-2.5 text-[11px] text-mute">
        Say what happened and the commissioner confirms. If yours is the claim that settles it,
        you collect a {CONFIG.currency}
        {CONFIG.findersFee} finder's fee.
      </p>

      <div className="mb-2.5 grid gap-1.5">
        {outcomes.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOutcomeId(o.id)}
            className={`rounded-lg border px-3 py-2 text-left text-sm ${
              outcomeId === o.id ? 'border-court bg-court/15 font-semibold' : 'border-line bg-panel-2'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <textarea
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        rows={2}
        maxLength={280}
        placeholder="What exactly was said or done? Quote it."
        className="mb-2.5 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-court"
      />

      {error && (
        <p className="mb-2.5 rounded-lg bg-down/10 px-2.5 py-1.5 text-[11px] text-down">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-lg border border-line py-2 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="flex-1 rounded-lg bg-court py-2 text-sm font-semibold text-ink disabled:opacity-40"
        >
          {pending ? 'Filing…' : 'File claim'}
        </button>
      </div>
    </div>
  )
}
