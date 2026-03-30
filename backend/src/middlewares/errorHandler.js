import { AppError } from '../utils/AppError.js'

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404))
}

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500

  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      details: err.details || null,
    },
  })
}
