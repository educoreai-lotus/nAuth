import { Router } from 'express'
import {
  oauthCallbackController,
  oauthStartController,
} from '../controllers/authController.js'

const router = Router()

router.get('/:provider/start', oauthStartController)
router.get('/:provider/callback', oauthCallbackController)

export default router
