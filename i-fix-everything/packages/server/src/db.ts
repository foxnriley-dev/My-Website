import postgres from 'postgres';
import { getEnv } from './env';

export type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;

let sql: Sql | null = null;

export function getSql(): Sql {
  if (!sql) {
    const env = getEnv();
    sql = postgres(env.DATABASE_URL, {
      max: env.DB_POOL_MAX,
      // Transaction-mode poolers (e.g. Supavisor :6543) do not support prepared statements.
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
      transform: { column: { from: postgres.toCamel } },
      onnotice: () => {},
    });
  }
  return sql;
}

export async function closeSql(): Promise<void> {
  if (sql) {
    const s = sql;
    sql = null;
    await s.end({ timeout: 5 });
  }
}

export interface UserContext {
  id: string;
  email: string | null;
  sessionId: string | null;
}

/**
 * Run `fn` in a transaction as role `app_user` with the caller's verified
 * claims, so Postgres row-level security applies to every statement.
 */
export async function withUser<T>(user: UserContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const claims = JSON.stringify({ sub: user.id, role: 'authenticated', email: user.email });
  return getSql().begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true), set_config('role', 'app_user', true)`;
    return fn(tx);
  }) as Promise<T>;
}

/**
 * Privileged transaction for the worker and system operations (bypasses RLS).
 * Callers must scope every statement by explicit ids from trusted records.
 */
export async function withSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getSql().begin((tx) => fn(tx)) as Promise<T>;
}

export const iso = (d: Date | string | null | undefined): string | null =>
  d == null ? null : (d instanceof Date ? d : new Date(d)).toISOString();
export const isoReq = (d: Date | string): string => (d instanceof Date ? d : new Date(d)).toISOString();

/** First row of a query that must return exactly one row (aggregates, inserts with RETURNING). */
export async function one<T>(rows: Promise<readonly T[]> | PromiseLike<readonly T[]>): Promise<T> {
  const result = await rows;
  if (result.length === 0) throw new Error('Expected one row, got none');
  return result[0]!;
}
