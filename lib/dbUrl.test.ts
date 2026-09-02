import { describe, it, expect, afterEach } from 'vitest'
import { isPooled, resolveDbUrl } from './dbUrl'

/**
 * Real URL shapes handed out by Supabase. Getting these two apart matters:
 * the :6543 pooler cannot run DDL and cannot use prepared statements, while
 * the :5432 session pooler can do both. Both hostnames contain "pooler".
 */
const SUPABASE_TXN =
  'postgres://postgres.abc:pw@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x'
const SUPABASE_SESSION =
  'postgres://postgres.abc:pw@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require'
const NEON_POOLED = 'postgres://u:pw@ep-cool-a1b2-pooler.us-east-2.aws.neon.tech/db?sslmode=require'
const NEON_DIRECT = 'postgres://u:pw@ep-cool-a1b2.us-east-2.aws.neon.tech/db?sslmode=require'
const LOCAL = 'postgres://postgres@127.0.0.1:5432/frutchey'

describe('isPooled', () => {
  it('flags the Supabase transaction pooler', () => {
    expect(isPooled(SUPABASE_TXN)).toBe(true)
  })

  it('does NOT flag the Supabase session pooler, whose host also says "pooler"', () => {
    // The whole reason the hostname check uses "-pooler." and not "pooler.".
    expect(isPooled(SUPABASE_SESSION)).toBe(false)
  })

  it('flags Neon\'s pooled endpoint and spares its direct one', () => {
    expect(isPooled(NEON_POOLED)).toBe(true)
    expect(isPooled(NEON_DIRECT)).toBe(false)
  })

  it('flags an explicit pgbouncer flag, and leaves a plain local URL alone', () => {
    expect(isPooled('postgres://u@h:5432/db?pgbouncer=true')).toBe(true)
    expect(isPooled(LOCAL)).toBe(false)
  })
})

describe('resolveDbUrl', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })

  const clear = () => {
    for (const k of [
      'POSTGRES_URL',
      'DATABASE_URL',
      'POSTGRES_URL_NON_POOLING',
      'DATABASE_URL_UNPOOLED',
    ]) {
      delete process.env[k]
    }
  }

  it('migrations take the unpooled URL even when a pooled one is present', () => {
    clear()
    process.env.POSTGRES_URL = SUPABASE_TXN
    process.env.POSTGRES_URL_NON_POOLING = SUPABASE_SESSION
    expect(resolveDbUrl('migration')).toBe(SUPABASE_SESSION)
    expect(isPooled(resolveDbUrl('migration'))).toBe(false)
  })

  it('runtime prefers the pooler, which serverless wants', () => {
    clear()
    process.env.POSTGRES_URL = SUPABASE_TXN
    process.env.POSTGRES_URL_NON_POOLING = SUPABASE_SESSION
    expect(resolveDbUrl('runtime')).toBe(SUPABASE_TXN)
  })

  it('falls back to whatever exists rather than failing', () => {
    clear()
    process.env.DATABASE_URL = LOCAL
    expect(resolveDbUrl('migration')).toBe(LOCAL)
    expect(resolveDbUrl('runtime')).toBe(LOCAL)
  })

  it('names the variables it wants when none are set', () => {
    clear()
    expect(() => resolveDbUrl('runtime')).toThrow(/POSTGRES_URL/)
  })
})
