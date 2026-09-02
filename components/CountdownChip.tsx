import { countdown, whenET } from '@/lib/format'

export function CountdownChip({
  locksAt,
  status,
  live,
}: {
  locksAt: Date
  status: string
  live?: boolean
}) {
  if (status === 'resolved') {
    return <span className="rounded-full bg-up/15 px-2 py-0.5 text-[11px] text-up">Settled</span>
  }
  if (status === 'void') {
    return <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] text-mute">Voided</span>
  }

  const left = countdown(locksAt)
  if (!left) {
    return (
      <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] text-mute">
        Closed · awaiting result
      </span>
    )
  }

  // Under two hours is the window where people actually need to hurry.
  const urgent = new Date(locksAt).getTime() - Date.now() < 2 * 60 * 60 * 1000
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap tabular-nums ${
        live || urgent ? 'bg-court/20 text-court' : 'bg-panel-2 text-mute'
      }`}
      title={whenET(locksAt)}
    >
      {live && <span className="live-dot mr-1">●</span>}
      {left} left
    </span>
  )
}
