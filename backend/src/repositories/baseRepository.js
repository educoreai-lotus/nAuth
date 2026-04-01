import { dbQuery, getDbPool } from '../config/database.js'

export async function executeQuery(queryText, params = []) {
  return dbQuery(queryText, params)
}

export function getRepositoryStatus() {
  return {
    ready: Boolean(getDbPool()),
    message: getDbPool()
      ? 'Database repository layer is configured.'
      : 'Database repository layer is not configured. Set DATABASE_URL.',
  }
}
