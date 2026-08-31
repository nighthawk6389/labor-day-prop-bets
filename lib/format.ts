import { CONFIG } from '@/content/config'

/** ₣1,000 */
export function money(units: number): string {
  return `${CONFIG.currency}${units.toLocaleString('en-US')}`
}

export function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

export function multiple(x: number): string {
  if (!isFinite(x) || x <= 0) return '—'
  return `${x.toFixed(1)}x`
}

const dt = new Intl.DateTimeFormat('en-US', {
  timeZone: CONFIG.timezone,
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/** "Thu 4:00 PM" in East Stroudsburg time, wherever the server happens to run. */
export function whenET(d: Date | string): string {
  return dt.format(typeof d === 'string' ? new Date(d) : d)
}

/** "2d 4h", "3h 12m", "8m" — or null once it has passed. */
export function countdown(to: Date | string, from: Date = new Date()): string | null {
  const ms = (typeof to === 'string' ? new Date(to) : to).getTime() - from.getTime()
  if (ms <= 0) return null
  const mins = Math.floor(ms / 60000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function isEarlyBird(at: Date = new Date()): boolean {
  return at.getTime() < new Date(CONFIG.earlyBirdUntil).getTime()
}
