import { AppError } from '../utils/AppError.js'
import { REFRESH_COOKIE_NAME, getRefreshCookieOptions, parseCookies } from '../utils/cookies.js'
import { signAccessToken } from '../utils/jwt.js'
import { generateRefreshToken, hashRefreshToken } from '../utils/tokenHash.js'
import {
  createAuthUser,
  createRefreshToken,
  createSession,
  findActiveRefreshTokenContextByHash,
  findProviderIdentity,
  invalidateSession,
  revokeRefreshToken,
  rotateOldRefreshToken,
  setRefreshTokenReplacement,
  upsertProviderIdentity,
} from '../repositories/authSessionRepository.js'

function getSessionExpiryDate() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
}

function getRefreshExpiryDate() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
}

function buildAccessClaims({ authUserId, provider, directoryData }) {
  return {
    sub: authUserId,
    provider,
    directory_user_id: directoryData.user_id || '',
    organization_id: directoryData.organization_id || '',
  }
}

export async function createAuthenticatedSession({
  providerIdentity,
  directoryData,
  authDecisionState,
  requestMeta,
}) {
  let providerRecord = await findProviderIdentity(
    providerIdentity.provider,
    providerIdentity.provider_user_id,
  )

  const authUser = providerRecord ? { id: providerRecord.auth_user_id } : await createAuthUser()

  providerRecord = await upsertProviderIdentity(authUser.id, providerIdentity, directoryData)

  const session = await createSession({
    authUserId: authUser.id,
    authDecisionState,
    ipAddress: requestMeta.ipAddress,
    userAgent: requestMeta.userAgent,
    deviceFingerprint: requestMeta.deviceFingerprint,
    expiresAt: getSessionExpiryDate(),
  })

  const rawRefreshToken = generateRefreshToken()
  const refreshTokenHash = hashRefreshToken(rawRefreshToken)
  const refreshTokenRow = await createRefreshToken({
    sessionId: session.id,
    tokenHash: refreshTokenHash,
    expiresAt: getRefreshExpiryDate(),
  })

  const accessToken = signAccessToken(
    buildAccessClaims({
      authUserId: authUser.id,
      provider: providerRecord.provider,
      directoryData,
    }),
  )

  return {
    accessToken,
    rawRefreshToken,
    authUserId: authUser.id,
    sessionId: session.id,
    refreshTokenId: refreshTokenRow.id,
  }
}

function getDirectoryDataFromProfileMetadata(profileMetadata) {
  return {
    user_id: profileMetadata?.directory_user_id || '',
    full_name: profileMetadata?.full_name || '',
    organization_id: profileMetadata?.organization_id || '',
    organization_name: profileMetadata?.organization_name || '',
  }
}

export async function refreshAuthenticatedSession(cookieHeader) {
  const cookies = parseCookies(cookieHeader)
  const rawRefreshToken = cookies[REFRESH_COOKIE_NAME]

  if (!rawRefreshToken) {
    throw new AppError('Missing refresh token cookie.', 401)
  }

  const refreshHash = hashRefreshToken(rawRefreshToken)
  const context = await findActiveRefreshTokenContextByHash(refreshHash)

  if (!context) {
    throw new AppError('Invalid or expired refresh token.', 401)
  }

  if (context.session_status !== 'active') {
    throw new AppError('Session is not active.', 401)
  }

  if (new Date(context.session_expires_at).getTime() <= Date.now()) {
    throw new AppError('SESSION_EXPIRED', 401)
  }

  if (new Date(context.refresh_expires_at).getTime() <= Date.now()) {
    throw new AppError('Refresh token is expired.', 401)
  }

  const newRawRefreshToken = generateRefreshToken()
  const newRefreshHash = hashRefreshToken(newRawRefreshToken)

  await rotateOldRefreshToken(context.refresh_token_id)
  const newTokenRow = await createRefreshToken({
    sessionId: context.session_id,
    tokenHash: newRefreshHash,
    expiresAt: getRefreshExpiryDate(),
    parentTokenId: context.refresh_token_id,
  })
  await setRefreshTokenReplacement(context.refresh_token_id, newTokenRow.id)

  const directoryData = getDirectoryDataFromProfileMetadata(context.profile_metadata || {})
  const accessToken = signAccessToken(
    buildAccessClaims({
      authUserId: context.auth_user_id,
      provider: context.provider || 'unknown',
      directoryData,
    }),
  )

  return {
    accessToken,
    rawRefreshToken: newRawRefreshToken,
    authState: 'AUTHENTICATED_LINKED',
  }
}

export async function logoutAuthenticatedSession(cookieHeader) {
  const cookies = parseCookies(cookieHeader)
  const rawRefreshToken = cookies[REFRESH_COOKIE_NAME]

  if (!rawRefreshToken) {
    return { success: true }
  }

  const refreshHash = hashRefreshToken(rawRefreshToken)
  const context = await findActiveRefreshTokenContextByHash(refreshHash)

  if (!context) {
    return { success: true }
  }

  await revokeRefreshToken(context.refresh_token_id, 'logout')
  await invalidateSession(context.session_id, 'logout')

  return { success: true }
}

export function setRefreshCookie(res, rawRefreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, getRefreshCookieOptions())
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions())
}
