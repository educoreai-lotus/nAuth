import dotenv from 'dotenv'

dotenv.config()

const requiredEnv = ['PORT']

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
})

export const config = {
  appName: 'nAuth Backend',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT),
  backendBaseUrl: process.env.BACKEND_BASE_URL || 'http://localhost:4000',
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  supabaseDatabaseUrl: process.env.SUPABASE_DATABASE_URL || '',
}
