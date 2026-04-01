import { Pool } from 'pg'
import { config } from './env.js'

let poolInstance = null

export function getDbPool() {
  if (!config.databaseUrl) {
    return null
  }

  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: config.databaseUrl,
      ssl: { rejectUnauthorized: false },
    })
  }

  return poolInstance
}

export async function dbQuery(text, params = []) {
  const pool = getDbPool()
  if (!pool) {
    throw new Error('DATABASE_URL is not configured.')
  }

  return pool.query(text, params)
}
