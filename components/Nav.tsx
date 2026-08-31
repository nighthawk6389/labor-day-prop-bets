import Link from 'next/link'

const items = [
  { href: '/', label: 'Markets', icon: '📊' },
  { href: '/claims', label: 'Claims', icon: '📣' },
  { href: '/leaderboard', label: 'Board', icon: '🏆' },
  { href: '/bets', label: 'My Bets', icon: '🎟️' },
]

export function Nav({ commissioner }: { commissioner: boolean }) {
  const all = commissioner ? [...items, { href: '/commish', label: 'Commish', icon: '⚖️' }] : items
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 backdrop-blur">
      <div
        className="mx-auto grid max-w-lg"
        style={{
          gridTemplateColumns: `repeat(${all.length}, minmax(0,1fr))`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {all.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-mute active:bg-panel-2"
          >
            <span className="text-lg leading-none">{i.icon}</span>
            {i.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
