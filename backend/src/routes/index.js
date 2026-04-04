import { Router } from 'express'
import { healthController } from '../controllers/healthController.js'
import authRoutes from './authRoutes.js'
import { AppError } from '../utils/AppError.js'
import {
  handleCoordinatorTokenValidationRequest,
  isNauthValidationAction,
  VALIDATION_ACTION,
} from '../services/coordinator/tokenValidationService.js'

const router = Router()

router.get('/health', healthController)
// Coordinator sends token validation requests to this fixed entrypoint.
router.post('/request', async (req, res, next) => {
  try {
    const body = req.body || {}
    const payload = body.payload || {}

    const receivedAction = payload?.action
    const expectedAction = VALIDATION_ACTION
    const actionMatches = isNauthValidationAction(payload)
    console.log('[nAuth][Coordinator /request][TEMP DEBUG] payload.action (raw):', receivedAction)
    console.log('[nAuth][Coordinator /request][TEMP DEBUG] expected VALIDATION_ACTION (raw):', expectedAction)
    console.log('[nAuth][Coordinator /request][TEMP DEBUG] equality === :', actionMatches)
    console.log(
      '[nAuth][Coordinator /request][TEMP DEBUG] lengths:',
      receivedAction != null ? String(receivedAction).length : 'n/a',
      expectedAction.length,
    )
    console.log(
      '[nAuth][Coordinator /request][TEMP DEBUG] JSON.stringify(receivedAction):',
      JSON.stringify(receivedAction),
    )
    console.log(
      '[nAuth][Coordinator /request][TEMP DEBUG] JSON.stringify(expectedAction):',
      JSON.stringify(expectedAction),
    )

    if (!actionMatches) {
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
