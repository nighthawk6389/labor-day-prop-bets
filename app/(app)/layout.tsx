import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { getBalance } from '@/lib/board'
import { Nav } from '@/components/Nav'
import { money } from '@/lib/format'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const balance = await getBalance(session.playerId)

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-bold tracking-tight">
            🎰 Frutchey Exchange
          </Link>
          <span className="rounded-full bg-panel px-2.5 py-1 text-sm font-semibold tabular-nums">
            {money(balance)}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-4">{children}</main>
      <Nav commissioner={session.commissioner} />
    </>
  )
}
