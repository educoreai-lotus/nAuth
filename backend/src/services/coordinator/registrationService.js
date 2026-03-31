import { buildNauthMigrationPayload } from './registrationPayload.js'

function assertCoordinatorApiUrl() {
  const coordinatorApiUrl = process.env.COORDINATOR_API_URL

  if (!coordinatorApiUrl) {
    throw new Error('Missing required environment variable: COORDINATOR_API_URL')
  }

  return coordinatorApiUrl.replace(/\/+$/, '')
}

function assertBackendBaseUrl() {
  const backendBaseUrl = process.env.BACKEND_BASE_URL

  if (!backendBaseUrl) {
    throw new Error('Missing required environment variable: BACKEND_BASE_URL')
  }

  return backendBaseUrl
}

async function postJson(url, payload, errorPrefix) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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
      `${errorPrefix} HTTP ${response.status}. Response: ${JSON.stringify(parsedBody || {})}`,
    )
  }

  return parsedBody || {}
}

export async function registerServiceWithCoordinator({
  serviceName,
  version,
  endpoint,
  healthCheck,
}) {
  const coordinatorApiUrl = assertCoordinatorApiUrl()
  const url = `${coordinatorApiUrl}/register`

  const payload = {
    serviceName,
    version,
    endpoint,
    healthCheck,
  }

  const response = await postJson(url, payload, 'Coordinator registration failed.')

  if (!response.serviceId) {
    throw new Error('Coordinator registration response missing serviceId.')
  }

  if (response.status && !['pending_migration', 'active'].includes(response.status)) {
    throw new Error(
      `Unexpected registration status: ${response.status}. Expected: pending_migration or active.`,
    )
  }

  return {
    serviceId: response.serviceId,
    status: response.status || 'pending_migration',
    raw: response,
  }
}

export async function autoRegisterOnStartup() {
  if (process.env.SERVICE_ID) {
    console.log('Service already registered. Skipping registration.')
    return { skipped: true }
  }

  try {
    const endpoint = assertBackendBaseUrl()
    const registration = await registerServiceWithCoordinator({
      serviceName: 'nAuth',
      version: '0.1.0',
      endpoint,
      healthCheck: '/health',
    })

    console.log('========================================')
    console.log('nAuth registration successful')
    console.log(`SERVICE_ID = ${registration.serviceId}`)
    console.log('IMPORTANT: Save this value in Railway ENV as SERVICE_ID')
    console.log('========================================')
    return { skipped: false, registration }
  } catch (error) {
    console.error('Coordinator registration failed during startup.')
    console.error(error.message)
    return { skipped: false, error: error.message }
  }
}

export async function autoUploadMigrationOnStartup() {
  if (!process.env.SERVICE_ID) {
    console.log('SERVICE_ID missing. Skipping migration upload.')
    return { skipped: true }
  }

  if (process.env.MIGRATION_UPLOADED === '1') {
    console.log('Migration already uploaded. Skipping.')
    return { skipped: true }
  }

  try {
    const coordinatorApiUrl = assertCoordinatorApiUrl()
    const serviceId = process.env.SERVICE_ID
    const migrationFile = buildNauthMigrationPayload()
    const url = `${coordinatorApiUrl}/register/${serviceId}/migration`

    const response = await postJson(
      url,
      { migrationFile },
      'Coordinator migration upload failed.',
    )

    if (response.status && response.status !== 'active') {
      throw new Error(`Unexpected migration response status: ${response.status}`)
    }

    console.log('========================================')
    console.log('Migration uploaded successfully')
    console.log('nAuth should now be ACTIVE')
    console.log('IMPORTANT: Set MIGRATION_UPLOADED=1 in Railway ENV')
    console.log('========================================')
    return { skipped: false, status: response.status || 'active' }
  } catch (error) {
    console.error('Coordinator migration upload failed during startup.')
    console.error(error.message)
    return { skipped: false, error: error.message }
  }
}
