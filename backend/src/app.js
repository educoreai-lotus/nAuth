import express from 'express'
import { config } from './config/env.js'
import routes from './routes/index.js'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js'

const app = express()
const CORS_ALLOW_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
const CORS_ALLOW_HEADERS = 'Content-Type, Authorization, X-Requested-With'

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '')
}

const allowedOrigins = new Set(config.corsAllowedOrigins.map(normalizeOrigin).filter(Boolean))

app.use((req, res, next) => {
  const requestOriginRaw = req.headers.origin
  const requestOrigin = normalizeOrigin(requestOriginRaw)
  const isAllowedOrigin = requestOrigin && allowedOrigins.has(requestOrigin)

  if (isAllowedOrigin) {
    res.header('Access-Control-Allow-Origin', requestOriginRaw)
    res.header('Vary', 'Origin')
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Methods', CORS_ALLOW_METHODS)
    res.header('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS)
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }

  next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(routes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
