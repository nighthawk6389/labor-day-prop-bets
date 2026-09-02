import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getPlayers } from '@/lib/board'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  if (await getSession()) redirect('/')
  const roster = await getPlayers()

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <header className="mb-7 text-center">
        <div className="mb-2 text-4xl">🎰</div>
        <h1 className="text-2xl font-bold tracking-tight">The Frutchey Exchange</h1>
        <p className="mt-1.5 text-sm text-mute">
          Labor Day weekend · East Stroudsburg · Men of Labor Day
        </p>
      </header>
      <LoginForm players={roster.map((p) => ({ id: p.id, name: p.name, emoji: p.emoji }))} />
    </main>
  )
}
