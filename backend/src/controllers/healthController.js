import { getHealthStatus } from '../services/healthService.js'

export function healthController(_req, res) {
  res.status(200).json({ success: true, data: getHealthStatus() })
}
