'use client'

import { useActionState, useState } from 'react'
import { login } from '@/app/actions/auth'

type P = { id: number; name: string; emoji: string }

export function LoginForm({ players }: { players: P[] }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [state, action, pending] = useActionState(login, null as { error?: string } | null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="playerId" value={picked ?? ''} />

      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-mute uppercase">Who are you?</p>
        <div className="grid grid-cols-3 gap-2">
          {players.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPicked(p.id)}
              className={`rounded-xl border px-2 py-3 text-center transition ${
                picked === p.id
                  ? 'border-court bg-court/15'
                  : 'border-line bg-panel active:opacity-70'
              }`}
            >
              <div className="text-2xl leading-none">{p.emoji}</div>
              <div className="mt-1.5 text-[11px] leading-tight font-medium">{p.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="pin"
          className="mb-2 block text-xs font-medium tracking-wide text-mute uppercase"
        >
          Your 2-digit code
        </label>
        <input
          id="pin"
          name="pin"
          inputMode="numeric"
          autoComplete="off"
          maxLength={2}
          placeholder="••"
          className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-center text-2xl tracking-[0.4em] tabular-nums outline-none focus:border-court"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-down/10 px-3 py-2 text-center text-sm text-down">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !picked}
        className="w-full rounded-xl bg-court py-3 font-semibold text-ink disabled:opacity-40"
      >
        {pending ? 'Checking…' : 'Enter the Exchange'}
      </button>
    </form>
  )
}
