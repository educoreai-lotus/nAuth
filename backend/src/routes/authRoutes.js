import { Router } from 'express'
import {
  logoutController,
  oauthCallbackController,
  oauthStartController,
  refreshController,
} from '../controllers/authController.js'

const router = Router()

router.get('/:provider/start', oauthStartController)
router.get('/:provider/callback', oauthCallbackController)
router.post('/refresh', refreshController)
router.post('/logout', logoutController)

export default router
