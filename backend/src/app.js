import express from 'express'
import cors from 'cors'
import { config } from './config/env.js'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js'
import { handleCoordinatorActionPayload } from './services/coordinator/directoryLookupService.js'

const app = express()

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '')
}

const allowedOrigins = config.corsAllowedOrigins.map(normalizeOrigin).filter(Boolean)
console.log('[nAuth][CORS] Allowed origins:', allowedOrigins)

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true)
      return
    }

    const normalized = normalizeOrigin(origin)
    if (allowedOrigins.includes(normalized)) {
      callback(null, true)
      return
    }

    callback(new Error('CORS origin not allowed'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(async (req, res, next) => {
  try {
    if (
      req.method !== 'POST' ||
      !req.body ||
      !req.body.requester_service ||
      !req.body.payload ||
      !req.body.payload.action
    ) {
      return next()
    }

    const coordinatorResponse = await handleCoordinatorActionPayload(req.body)
    res.status(200).json({
      requester_service: 'nAuth',
      response: coordinatorResponse,
    })
  } catch (error) {
    next(error)
  }
})

app.use(routes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
