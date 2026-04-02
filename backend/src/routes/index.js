import { Router } from 'express'
import { healthController } from '../controllers/healthController.js'
import authRoutes from './authRoutes.js'
import { AppError } from '../utils/AppError.js'
import {
  handleCoordinatorTokenValidationRequest,
  isNauthValidationAction,
} from '../services/coordinator/tokenValidationService.js'

const router = Router()

router.get('/health', healthController)
router.post('/request', async (req, res, next) => {
  try {
    const body = req.body || {}
    const payload = body.payload || {}

    if (!isNauthValidationAction(payload)) {
      throw new AppError('Unsupported coordinator action for nAuth.', 400)
    }

    const response = await handleCoordinatorTokenValidationRequest(body)
    res.status(200).json({
      requester_service: 'nAuth',
      response,
    })
  } catch (error) {
    next(error)
  }
})
router.use('/auth', authRoutes)

export default router
