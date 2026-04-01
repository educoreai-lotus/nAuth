import { getHealthStatus } from '../services/healthService.js'

export async function healthController(_req, res, next) {
  try {
    const health = await getHealthStatus()
    res.status(200).json({ success: true, data: health })
  } catch (error) {
    next(error)
  }
}
