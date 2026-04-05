import { AppError } from '../../utils/AppError.js'
import { createSignedCoordinatorHeaders } from '../../utils/signing.js'
import {
  handleCoordinatorTokenValidationRequest,
  isNauthValidationAction,
} from './tokenValidationService.js'

function getCoordinatorApiUrl() {
  const url = process.env.COORDINATOR_API_URL
  if (!url) {
    throw new AppError('Missing required environment variable: COORDINATOR_API_URL', 500)
  }

  return url.replace(/\/+$/, '')
}

function buildLookupPayload(providerIdentity) {
  const action =
    'Route this request to Directory service only for user lookup and organization association.'

  if (providerIdentity.provider === 'google') {
    const payload = {
      action,
      provider: 'google',
    }

    if (providerIdentity.email) {
      payload.email = providerIdentity.email
    }

    return payload
  }

  if (providerIdentity.provider === 'github') {
    const payload = {
      action,
      provider: 'github',
      provider_user_id: providerIdentity.provider_user_id,
    }

    if (providerIdentity.github_profile_url) {
      payload.github_profile_url = providerIdentity.github_profile_url
    }

    if (providerIdentity.email) {
      payload.email = providerIdentity.email
    }

    return payload
  }

  throw new AppError(`Unsupported provider for directory lookup: ${providerIdentity.provider}`, 400)
}

function validateDirectoryResponse(directoryData) {
  const requiredKeys = [
    'user_exists',
    'user_id',
    'full_name',
    'organization_id',
    'organization_name',
  ]

  return requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(directoryData, key))
}

function decideAuthState(directoryData) {
  if (directoryData.user_exists === true && directoryData.organization_id) {
    return {
      authState: 'AUTHENTICATED_LINKED',
      nextStep: 'Prepare server-side session initialization in next phase.',
    }
  }

  if (directoryData.user_exists === true && !directoryData.organization_id) {
    return {
      authState: 'AUTHENTICATED_NO_ORG',
      nextStep: 'Request organization association flow in next phase.',
    }
  }

  if (directoryData.user_exists === false) {
    return {
      authState: 'USER_NOT_FOUND',
      nextStep: 'Handle onboarding or provisioning path in next phase.',
    }
  }

  return {
    authState: 'LOOKUP_FAILED',
    nextStep: 'Retry lookup or inspect Coordinator/Directory response.',
  }
}

export async function handleCoordinatorActionPayload(requestBody = {}) {
  const payload = requestBody?.payload || {}

  if (isNauthValidationAction(payload)) {
    return handleCoordinatorTokenValidationRequest(requestBody)
  }

  throw new AppError('Unsupported coordinator action for nAuth.', 400)
}

export async function lookupUserViaCoordinator(providerIdentity) {
  const payload = buildLookupPayload(providerIdentity)
  const requestBody = {
    requester_service: 'nAuth',
    payload,
    response: {
      user_exists: false,
      user_id: '',
      full_name: '',
      organization_id: '',
      organization_name: '',
      primary_role: '',
      roles: [],
      is_system_admin: false,
    },
  }

  const headers = createSignedCoordinatorHeaders(requestBody)
  const url = `${getCoordinatorApiUrl()}/request`

  try {
    console.log('[nAuth][DirectoryLookup] Outgoing request body:', JSON.stringify(requestBody))
    console.log(
      '[nAuth][DirectoryLookup] Outgoing payload keys:',
      Object.keys(requestBody.payload || {}),
    )

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    const bodyText = await response.text()
    let responseBody = null
    if (bodyText) {
      try {
        responseBody = JSON.parse(bodyText)
      } catch {
        responseBody = null
      }
    }

    if (!response.ok) {
      return {
        directoryData: requestBody.response,
        authState: 'LOOKUP_FAILED',
        nextStep: 'Coordinator request failed. Investigate service connectivity.',
        error: `HTTP ${response.status}`,
      }
    }

    const directoryData = responseBody?.response || responseBody?.data?.response || responseBody

    if (!directoryData || !validateDirectoryResponse(directoryData)) {
      return {
        directoryData: requestBody.response,
        authState: 'LOOKUP_FAILED',
        nextStep: 'Directory response invalid. Validate contract with Coordinator.',
        error: 'Invalid directory response structure',
      }
    }

    console.log('[nAuth][DirectoryLookup] Optional auth context present:', {
      primary_role: Boolean(directoryData.primary_role),
      roles_count: Array.isArray(directoryData.roles) ? directoryData.roles.length : 0,
      is_system_admin: Boolean(directoryData.is_system_admin),
    })

    const decision = decideAuthState(directoryData)
    return {
      directoryData,
      ...decision,
    }
  } catch (error) {
    return {
      directoryData: requestBody.response,
      authState: 'LOOKUP_FAILED',
      nextStep: 'Coordinator lookup failed. Check network and environment configuration.',
      error: error.message,
    }
  }
}
