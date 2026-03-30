import { config } from '../config/env.js'

export function getHealthStatus() {
  return {
    service: config.appName,
    status: 'ok',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  }
}
