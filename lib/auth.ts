import 'server-only'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { players } from '@/db/schema'

const COOKIE = 'frutchey_session'
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'insecure-development-secret-please-set-AUTH_SECRET',
)

export type Session = { playerId: number; slug: string; commissioner: boolean }

export async function createSession(s: Session) {
  const token = await new SignJWT({ ...s })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)

  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function destroySession() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return {
      playerId: Number(payload.playerId),
      slug: String(payload.slug),
      commissioner: Boolean(payload.commissioner),
    }
  } catch {
    return null
  }
}

/** Verify a 4-digit PIN against the roster. Returns null on any mismatch. */
export async function verifyPin(playerId: number, pin: string): Promise<Session | null> {
  const [p] = await db.select().from(players).where(eq(players.id, playerId)).limit(1)
  if (!p) return null
  if (!(await bcrypt.compare(pin, p.pinHash))) return null
  return { playerId: p.id, slug: p.slug, commissioner: p.isCommissioner }
}

export const hashPin = (pin: string) => bcrypt.hash(pin, 10)
