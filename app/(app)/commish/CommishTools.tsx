'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  approveClaim,
  rejectClaim,
  resolveMarket,
  voidMarket,
  pushLiveDrop,
  closeWeekend,
} from '@/app/actions/admin'

type Pending = {
  id: number
  marketTitle: string
  outcomeLabel: string
  quote: string
  claimant: string
}
type Mkt = { id: number; title: string; open: boolean; outcomes: { id: number; label: string }[] }

export function CommishTools({
  pending,
  markets,
  weekendClosed,
}: {
  pending: Pending[]
  markets: Mkt[]
  weekendClosed: boolean
}) {
  const router = useRouter()
  const [busy, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn()
      setMsg(r.ok ? '✅ Done' : `⚠️ ${r.error}`)
      router.refresh()
      setTimeout(() => setMsg(null), 3000)
    })

  // ── resolve form state
  const [marketId, setMarketId] = useState<number | undefined>()
  const [outcomeId, setOutcomeId] = useState<number | undefined>()
  const [note, setNote] = useState('')
  const chosen = markets.find((m) => m.id === marketId)

  // ── live drop state
  const [dropTitle, setDropTitle] = useState('')
  const [dropOutcomes, setDropOutcomes] = useState('Yes\nNo')
  const [dropMins, setDropMins] = useState(20)

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold">⚖️ Commish</h1>
        <p className="mt-1 text-sm text-mute">
          Confirm claims, settle markets, drop live ones. Settlement is idempotent — a double
          tap can't pay twice.
        </p>
      </header>

      {msg && <p className="rounded-lg bg-panel-2 px-3 py-2 text-sm">{msg}</p>}

      {/* ── Pending claims ─────────────────────────────── */}
      <section>
        <h2 className="mb-2 text-xs font-medium tracking-wide text-mute uppercase">
          Pending claims ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-line bg-panel p-3 text-sm text-mute">
            Nothing waiting on you.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((c) => (
              <li key={c.id} className="rounded-xl border border-court/40 bg-panel p-3">
                <p className="text-sm font-semibold">{c.marketTitle}</p>
                <p className="mt-0.5 text-sm text-mute">→ {c.outcomeLabel}</p>
                {c.quote && <p className="mt-1.5 text-sm italic">"{c.quote}"</p>}
                <p className="mt-1.5 text-[11px] text-mute">filed by {c.claimant}</p>
                <div className="mt-2.5 flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => run(() => approveClaim(c.id))}
                    className="flex-1 rounded-lg bg-up py-2 text-sm font-semibold text-ink disabled:opacity-40"
                  >
                    Approve &amp; pay out
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => run(() => rejectClaim(c.id))}
                    className="rounded-lg border border-line px-4 py-2 text-sm disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Manual resolve ─────────────────────────────── */}
      <section className="rounded-xl border border-line bg-panel p-3.5">
        <h2 className="mb-2.5 text-sm font-semibold">Settle a market by hand</h2>

        <select
          value={marketId ?? ''}
          onChange={(e) => {
            setMarketId(Number(e.target.value) || undefined)
            setOutcomeId(undefined)
          }}
          className="mb-2 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm"
        >
          <option value="">Pick a market…</option>
          {markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.open ? '' : '🔒 '}
              {m.title}
            </option>
          ))}
        </select>

        {chosen && (
          <select
            value={outcomeId ?? ''}
            onChange={(e) => setOutcomeId(Number(e.target.value) || undefined)}
            className="mb-2 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm"
          >
            <option value="">What happened?</option>
            {chosen.outcomes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="One line for the record"
          className="mb-2.5 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm"
        />

        <div className="flex gap-2">
          <button
            disabled={busy || !marketId || !outcomeId}
            onClick={() => run(() => resolveMarket(marketId!, outcomeId!, note))}
            className="flex-1 rounded-lg bg-court py-2 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Settle &amp; pay
          </button>
          <button
            disabled={busy || !marketId}
            onClick={() => run(() => voidMarket(marketId!, note || 'Voided by commissioner'))}
            className="rounded-lg border border-line px-4 py-2 text-sm disabled:opacity-40"
          >
            Void
          </button>
        </div>
        <p className="mt-2 text-[10px] text-mute">
          Void refunds every stake at cost. Use it when a market stops making sense.
        </p>
      </section>

      {/* ── Live drop ──────────────────────────────────── */}
      <section className="rounded-xl border border-line bg-panel p-3.5">
        <h2 className="mb-1 text-sm font-semibold">⚡ Push a live drop</h2>
        <p className="mb-2.5 text-[11px] text-mute">
          Pins to the top of the feed and closes fast. This is what keeps the app open.
        </p>
        <input
          value={dropTitle}
          onChange={(e) => setDropTitle(e.target.value)}
          placeholder="Do the burgers burn?"
          className="mb-2 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm"
        />
        <textarea
          value={dropOutcomes}
          onChange={(e) => setDropOutcomes(e.target.value)}
          rows={3}
          className="mb-2 w-full rounded-lg border border-line bg-panel-2 px-3 py-2 font-mono text-sm"
          placeholder={'One outcome per line'}
        />
        <div className="mb-2.5 flex items-center gap-2">
          <label className="text-sm text-mute">Closes in</label>
          <input
            type="number"
            min={1}
            max={240}
            value={dropMins}
            onChange={(e) => setDropMins(Number(e.target.value))}
            className="w-20 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm tabular-nums"
          />
          <span className="text-sm text-mute">min</span>
        </div>
        <button
          disabled={busy || !dropTitle.trim()}
          onClick={() =>
            run(async () => {
              const r = await pushLiveDrop(dropTitle, dropOutcomes.split('\n'), dropMins)
              if (r.ok) {
                setDropTitle('')
                setDropOutcomes('Yes\nNo')
              }
              return r
            })
          }
          className="w-full rounded-lg bg-court py-2 text-sm font-semibold text-ink disabled:opacity-40"
        >
          Drop it
        </button>
      </section>

      {/* ── Close the weekend ──────────────────────────── */}
      <section className="rounded-xl border border-line bg-panel p-3.5">
        <h2 className="mb-1 text-sm font-semibold">Settle up</h2>
        <p className="mb-2.5 text-[11px] text-mute">
          Closing the weekend reveals the real-dollar split on the leaderboard. Settle every
          market first.
        </p>
        <button
          disabled={busy}
          onClick={() => run(() => closeWeekend(!weekendClosed))}
          className="w-full rounded-lg border border-line py-2 text-sm font-semibold disabled:opacity-40"
        >
          {weekendClosed ? 'Reopen the weekend' : 'Close the weekend'}
        </button>
      </section>
    </div>
  )
}
