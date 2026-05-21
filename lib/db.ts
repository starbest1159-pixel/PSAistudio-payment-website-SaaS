import { Pool, QueryResult } from 'pg'

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    })

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err)
    })
  }
  return pool
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = getPool()
  const start = Date.now()
  try {
    const result = await client.query<T>(text, params)
    const duration = Date.now() - start
    if (duration > 1000) {
      console.warn('Slow query detected', { text, duration })
    }
    return result
  } catch (error) {
    console.error('Database query error:', { text, error })
    throw error
  }
}

export async function transaction<T>(
  callback: (q: typeof query) => Promise<T>
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const boundQuery = <R = Record<string, unknown>>(text: string, params?: unknown[]) =>
      client.query<R>(text, params)
    const result = await callback(boundQuery as typeof query)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
