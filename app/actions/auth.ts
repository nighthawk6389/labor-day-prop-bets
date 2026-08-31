'use server'

import { redirect } from 'next/navigation'
import { createSession, destroySession, verifyPin } from '@/lib/auth'

export async function login(_prev: unknown, form: FormData) {
  const playerId = Number(form.get('playerId'))
  const pin = String(form.get('pin') ?? '').trim()

  if (!playerId) return { error: 'Pick your name first.' }
  if (!/^\d{4}$/.test(pin)) return { error: 'PIN is four digits.' }

  const session = await verifyPin(playerId, pin)
  if (!session) return { error: 'Wrong PIN. Ask Ilan.' }

  await createSession(session)
  redirect('/')
}

export async function logout() {
  await destroySession()
  redirect('/login')
}
