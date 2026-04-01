import dotenv from 'dotenv'

dotenv.config()

const requiredEnv = ['PORT', 'BACKEND_BASE_URL', 'FRONTEND_BASE_URL']

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
})

export const config = {
  appName: 'nAuth Backend',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT),
  backendBaseUrl: process.env.BACKEND_BASE_URL,
  frontendBaseUrl: process.env.FRONTEND_BASE_URL,
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_BASE_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL || '',
  supabaseDatabaseUrl: process.env.SUPABASE_DATABASE_URL || '',
}
