import { executeQuery } from './baseRepository.js'

export async function findProviderIdentity(provider, providerUserId) {
  const result = await executeQuery(
    `SELECT *
     FROM provider_identities
     WHERE provider = $1 AND provider_user_id = $2
     LIMIT 1`,
    [provider, providerUserId],
  )

  return result.rows[0] || null
}

export async function createAuthUser() {
  const result = await executeQuery(
    `INSERT INTO auth_users (status)
     VALUES ('active')
     RETURNING *`,
  )

  return result.rows[0]
}

function normalizeRolesForMetadata(directoryData) {
  if (Array.isArray(directoryData.roles)) {
    return directoryData.roles
  }
  return []
}

export async function upsertProviderIdentity(authUserId, providerIdentity, directoryData) {
  const profileMetadata = {
    ...(providerIdentity.provider_metadata || {}),
    directory_user_id: directoryData.user_id || '',
    full_name: directoryData.full_name || '',
    organization_id: directoryData.organization_id || '',
    organization_name: directoryData.organization_name || '',
    primary_role:
      directoryData.primary_role != null && directoryData.primary_role !== ''
        ? String(directoryData.primary_role)
        : '',
    roles: normalizeRolesForMetadata(directoryData),
    is_system_admin: Boolean(directoryData.is_system_admin),
  }

  const result = await executeQuery(
    `INSERT INTO provider_identities (
      auth_user_id,
      provider,
      provider_user_id,
      email,
      github_profile_url,
      linkedin_profile_url,
      profile_metadata
    )
    VALUES ($1, $2, $3, $4, $5, NULL, $6::jsonb)
    ON CONFLICT (provider, provider_user_id)
    DO UPDATE SET
      email = EXCLUDED.email,
      github_profile_url = EXCLUDED.github_profile_url,
      profile_metadata = EXCLUDED.profile_metadata,
      updated_at = NOW()
    RETURNING *`,
    [
      authUserId,
      providerIdentity.provider,
      providerIdentity.provider_user_id,
      providerIdentity.email || null,
      providerIdentity.github_profile_url || null,
      JSON.stringify(profileMetadata),
    ],
  )

  return result.rows[0]
}

export async function createSession({
  authUserId,
  authDecisionState,
  ipAddress,
  userAgent,
  deviceFingerprint,
  expiresAt,
}) {
  const result = await executeQuery(
    `INSERT INTO sessions (
      auth_user_id,
      status,
      auth_decision_state,
      ip_address,
      user_agent,
      device_fingerprint,
      expires_at
    )
    VALUES ($1, 'active', $2, $3, $4, $5, $6)
    RETURNING *`,
    [authUserId, authDecisionState, ipAddress, userAgent, deviceFingerprint, expiresAt],
  )

  return result.rows[0]
}

export async function createRefreshToken({
  sessionId,
  tokenHash,
  expiresAt,
  parentTokenId = null,
  status = 'active',
}) {
  const result = await executeQuery(
    `INSERT INTO refresh_tokens (
      session_id,
      token_hash,
      token_hash_algo,
      status,
      parent_token_id,
      expires_at
    )
    VALUES ($1, $2, 'sha256', $3, $4, $5)
    RETURNING *`,
    [sessionId, tokenHash, status, parentTokenId, expiresAt],
  )

  return result.rows[0]
}

export async function setRefreshTokenReplacement(oldTokenId, newTokenId) {
  await executeQuery(
    `UPDATE refresh_tokens
     SET replaced_by_token_id = $2, consumed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [oldTokenId, newTokenId],
  )
}

export async function findActiveRefreshTokenContextByHash(tokenHash) {
  const result = await executeQuery(
    `SELECT
      rt.id AS refresh_token_id,
      rt.session_id,
      rt.expires_at AS refresh_expires_at,
      s.id AS session_id_ref,
      s.auth_user_id,
      s.status AS session_status,
      s.expires_at AS session_expires_at,
      pi.provider,
      pi.profile_metadata
    FROM refresh_tokens rt
    JOIN sessions s ON s.id = rt.session_id
    LEFT JOIN provider_identities pi ON pi.auth_user_id = s.auth_user_id
    WHERE rt.token_hash = $1
      AND rt.status = 'active'
    ORDER BY pi.updated_at DESC NULLS LAST
    LIMIT 1`,
    [tokenHash],
  )

  return result.rows[0] || null
}

export async function rotateOldRefreshToken(refreshTokenId) {
  await executeQuery(
    `UPDATE refresh_tokens
     SET status = 'rotated', consumed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [refreshTokenId],
  )
}

export async function revokeRefreshToken(refreshTokenId, reason = 'logout') {
  await executeQuery(
    `UPDATE refresh_tokens
     SET status = 'revoked', revoked_at = NOW(), revoked_reason = $2, updated_at = NOW()
     WHERE id = $1`,
    [refreshTokenId, reason],
  )
}

export async function invalidateSession(sessionId, reason = 'logout') {
  await executeQuery(
    `UPDATE sessions
     SET status = 'logged_out', revoked_at = NOW(), revoked_reason = $2, updated_at = NOW()
     WHERE id = $1`,
    [sessionId, reason],
  )
}

export async function findLatestActiveSessionContextByAuthUserId(authUserId) {
  const result = await executeQuery(
    `SELECT
      s.id AS session_id,
      s.auth_user_id,
      s.status AS session_status,
      s.expires_at AS session_expires_at,
      pi.provider,
      pi.profile_metadata
    FROM sessions s
    LEFT JOIN provider_identities pi ON pi.auth_user_id = s.auth_user_id
    WHERE s.auth_user_id = $1
      AND s.status = 'active'
      AND s.expires_at > NOW()
    ORDER BY s.updated_at DESC, pi.updated_at DESC NULLS LAST
    LIMIT 1`,
    [authUserId],
  )

  return result.rows[0] || null
}

export async function hasActiveRefreshTokenForSession(sessionId) {
  const result = await executeQuery(
    `SELECT 1
     FROM refresh_tokens
     WHERE session_id = $1
       AND status = 'active'
       AND expires_at > NOW()
     LIMIT 1`,
    [sessionId],
  )

  return result.rowCount > 0
}
