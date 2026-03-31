import dotenv from 'dotenv'
import { buildNauthMigrationPayload } from '../src/services/coordinator/registrationPayload.js'

dotenv.config()

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

async function run() {
  console.log('Starting manual Stage 2 migration upload...')

  const coordinatorApiUrl = requireEnv('COORDINATOR_API_URL').replace(/\/+$/, '')
  const serviceId = requireEnv('SERVICE_ID')
  const migrationFile = buildNauthMigrationPayload()

  const url = `${coordinatorApiUrl}/register/${serviceId}/migration`
  console.log(`Uploading migration to ${url} ...`)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ migrationFile }),
  })

  const bodyText = await response.text()
  let parsedBody = null

  if (bodyText) {
    try {
      parsedBody = JSON.parse(bodyText)
    } catch {
      parsedBody = { raw: bodyText }
    }
  }

  if (!response.ok) {
    throw new Error(
      `Migration upload failed. HTTP ${response.status}. Response: ${JSON.stringify(parsedBody || {})}`,
    )
  }

  if (parsedBody && parsedBody.status && parsedBody.status !== 'active') {
    throw new Error(`Unexpected migration response status: ${parsedBody.status}`)
  }

  console.log('Migration successful. nAuth should now become ACTIVE in Coordinator.')
}

run().catch((error) => {
  console.error('Manual migration upload failed.')
  console.error(error.message)
  process.exit(1)
})
