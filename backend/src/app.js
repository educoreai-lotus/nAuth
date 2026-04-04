import express from 'express'
import cors from 'cors'
import { config } from './config/env.js'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js'

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

// Coordinator proxy may send duplicated Content-Type; express.json() rejects it and leaves req.body unset.
app.use((req, res, next) => {
  const contentType = req.headers['content-type']
  if (contentType === 'application/json, application/json') {
    req.headers['content-type'] = 'application/json'
  }
  next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(routes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
