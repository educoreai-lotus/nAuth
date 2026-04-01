import { config } from '../config/env.js'
import { checkDatabaseConnection } from './databaseService.js'

export async function getHealthStatus() {
  const database = await checkDatabaseConnection()

  return {
    service: config.appName,
    status: 'ok',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    database,
  }
}
