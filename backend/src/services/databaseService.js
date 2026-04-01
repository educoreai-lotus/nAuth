import { dbQuery, getDbPool } from '../config/database.js'

export async function checkDatabaseConnection() {
  if (!getDbPool()) {
    return {
      connected: false,
      status: 'not_configured',
      message: 'DATABASE_URL is not configured.',
    }
  }

  try {
    await dbQuery('SELECT 1')
    return {
      connected: true,
      status: 'up',
      message: 'Database connection is healthy.',
    }
  } catch (error) {
    return {
      connected: false,
      status: 'down',
      message: 'Database query failed.',
      error: error.message,
    }
  }
}
