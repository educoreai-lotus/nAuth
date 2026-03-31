import dotenv from 'dotenv'
import { config } from '../src/config/env.js'
import { registerServiceWithCoordinator } from '../src/services/coordinator/registrationService.js'

dotenv.config()

async function run() {
  console.log('Starting manual Stage 1 nAuth registration with Coordinator...')

  const registration = await registerServiceWithCoordinator({
    serviceName: 'nAuth',
    version: '0.1.0',
    endpoint: config.backendBaseUrl,
    healthCheck: '/health',
  })

  console.log('========================================')
  console.log('nAuth registration successful')
  console.log(`SERVICE_ID = ${registration.serviceId}`)
  console.log('IMPORTANT: Save this value in Railway ENV as SERVICE_ID')
  console.log('========================================')
}

run().catch((error) => {
  console.error('Coordinator one-time registration failed.')
  console.error(error.message)
  process.exit(1)
})
