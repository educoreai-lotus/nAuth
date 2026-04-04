import { signAccessToken, verifyAccessToken, verifyAccessTokenIgnoreExpiration } from '../../utils/jwt.js'
import {
  findLatestActiveSessionContextByAuthUserId,
  hasActiveRefreshTokenForSession,
} from '../../repositories/authSessionRepository.js'

export const VALIDATION_ACTION =
  'Route this request to nAuth service only for access token validation and session continuity decision.'

function buildInvalidResponse(reason = 'TOKEN_VALIDATION_FAILED') {
  return {
    valid: false,
    reason,
    auth_state: 'ACCESS_TOKEN_INVALID',
    directory_user_id: '',
    organization_id: '',
    new_access_token: '',
  }
}

function buildValidResponse(authState, directoryUserId, organizationId, newAccessToken = '') {
  return {
    valid: true,
    reason: '',
    auth_state: authState,
    directory_user_id: directoryUserId || '',
    organization_id: organizationId || '',
    new_access_token: newAccessToken,
  }
}

function readDirectoryContextFromSession(sessionContext) {
  const profileMetadata = sessionContext?.profile_metadata || {}
  return {
    directoryUserId: profileMetadata.directory_user_id || '',
    organizationId: profileMetadata.organization_id || '',
  }
}

function matchesOptionalPayloadContext(payload, directoryUserId, organizationId) {
  if (payload.directory_user_id && payload.directory_user_id !== directoryUserId) {
    return false
  }

  if (payload.organization_id && payload.organization_id !== organizationId) {
    return false
  }

  return true
}

async function getActiveSessionOrNull(authUserId) {
  const sessionContext = await findLatestActiveSessionContextByAuthUserId(authUserId)
  if (!sessionContext) {
    return null
  }

  const hasActiveRefreshToken = await hasActiveRefreshTokenForSession(sessionContext.session_id)
  if (!hasActiveRefreshToken) {
    return null
  }

  return sessionContext
}

export function isNauthValidationAction(payload = {}) {
  return payload?.action === VALIDATION_ACTION
}

export async function handleCoordinatorTokenValidationRequest(body = {}) {
  const payload = body?.payload || {}
  const accessToken = payload.access_token

  if (!accessToken) {
    return buildInvalidResponse('MISSING_ACCESS_TOKEN')
  }

  try {
    const verified = verifyAccessToken(accessToken)
    const sessionContext = await getActiveSessionOrNull(verified.sub)
    if (!sessionContext) {
      return buildInvalidResponse('SESSION_NOT_ACTIVE_OR_REVOKED')
    }

    const sessionDirectory = readDirectoryContextFromSession(sessionContext)
    const directoryUserId = verified.directoryUserId || sessionDirectory.directoryUserId
    const organizationId = verified.organizationId || sessionDirectory.organizationId

    if (!matchesOptionalPayloadContext(payload, directoryUserId, organizationId)) {
      return buildInvalidResponse('DIRECTORY_CONTEXT_MISMATCH')
    }

    return buildValidResponse('ACCESS_TOKEN_VALID', directoryUserId, organizationId)
  } catch (error) {
    if (error?.name !== 'TokenExpiredError') {
      return buildInvalidResponse(error?.message || 'ACCESS_TOKEN_INVALID')
    }

    try {
      const expiredClaims = verifyAccessTokenIgnoreExpiration(accessToken)
      const sessionContext = await getActiveSessionOrNull(expiredClaims.sub)
      if (!sessionContext) {
        return buildInvalidResponse('SESSION_NOT_ACTIVE_OR_REVOKED')
      }

      const sessionDirectory = readDirectoryContextFromSession(sessionContext)
      const directoryUserId = expiredClaims.directoryUserId || sessionDirectory.directoryUserId
      const organizationId = expiredClaims.organizationId || sessionDirectory.organizationId

      if (!matchesOptionalPayloadContext(payload, directoryUserId, organizationId)) {
        return buildInvalidResponse('DIRECTORY_CONTEXT_MISMATCH')
      }

      const refreshedToken = signAccessToken({
        sub: expiredClaims.sub,
        provider: expiredClaims.provider || sessionContext.provider || 'unknown',
        directoryUserId,
        organizationId,
      })

      return buildValidResponse(
        'ACCESS_TOKEN_REFRESHED',
        directoryUserId,
        organizationId,
        refreshedToken,
      )
    } catch (refreshError) {
      return buildInvalidResponse(refreshError?.message || 'ACCESS_TOKEN_INVALID')
    }
  }
}
