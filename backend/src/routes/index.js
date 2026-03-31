import { Router } from 'express'
import { healthController } from '../controllers/healthController.js'
import authRoutes from './authRoutes.js'

const router = Router()

router.get('/health', healthController)
router.use('/auth', authRoutes)

export default router
