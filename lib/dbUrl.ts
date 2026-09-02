/**
 * Connection-string resolution, shared by the app and the deploy script.
 *
 * Hosts hand out two URLs and they are not interchangeable:
 *   - a transaction-mode pooler (Supabase :6543) — right for serverless runtime,
 *     wrong for DDL, and incompatible with prepared statements
 *   - a session-mode/direct URL (:5432) — required for migrations
 */

const RUNTIME_VARS = [
  'POSTGRES_URL',
  'DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
] as const

const MIGRATION_VARS = [
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
  'DATABASE_URL',
  'POSTGRES_URL',
] as const

/**
 * `runtime` prefers the pooler; `migration` insists on an unpooled connection
 * first, because DDL through a transaction pooler fails obscurely.
 */
export function resolveDbUrl(mode: 'runtime' | 'migration'): string {
  const order = mode === 'migration' ? MIGRATION_VARS : RUNTIME_VARS
  for (const name of order) {
    const value = process.env[name]
    if (value) return value
  }
  throw new Error(
    `No database connection string. Set one of: ${order.join(', ')}.\n` +
      'On Vercel these come from the Postgres/Supabase integration; locally they go in .env',
  )
}

/**
 * True for a transaction-mode pooler, where prepared statements are unavailable.
 *
 * The hostname check is deliberately `-pooler.` with the hyphen: that matches Neon's
 * transaction pooler (`ep-xxx-pooler.region.aws.neon.tech`) while *not* matching
 * Supabase's session-mode host (`aws-1-us-east-1.pooler.supabase.com`), which is a
 * full session and handles prepared statements fine. Loosening this to `pooler.`
 * would silently disable prepared statements on every Supabase connection.
 */
export function isPooled(url: string): boolean {
  return url.includes('pgbouncer=true') || url.includes(':6543') || url.includes('-pooler.')
}

/** Whether any usable connection string is configured at all. */
export function hasDbUrl(): boolean {
  return [...RUNTIME_VARS, ...MIGRATION_VARS].some((n) => !!process.env[n])
}
