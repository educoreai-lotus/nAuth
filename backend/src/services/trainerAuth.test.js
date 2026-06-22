import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { describe, it, before } from 'node:test'

function setupTestEnv() {
  process.env.PORT = process.env.PORT || '3000'
  process.env.BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:3000'
  process.env.FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173'

  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  process.env.JWT_PRIVATE_KEY = privateKey.replace(/\n/g, '\\n')
  process.env.JWT_PUBLIC_KEY = publicKey.replace(/\n/g, '\\n')
  process.env.JWT_ISSUER = 'nauth-test'
  process.env.JWT_AUDIENCE = 'nauth-test-audience'
}

describe('is_trainer auth pipeline', () => {
  let buildAccessClaims
  let signAccessToken
  let verifyAccessToken

  before(async () => {
    setupTestEnv()
    ;({ buildAccessClaims } = await import('./authSessionService.js'))
    ;({ signAccessToken, verifyAccessToken } = await import('../utils/jwt.js'))
  })

  it('buildAccessClaims defaults isTrainer to false when is_trainer is missing', () => {
    const claims = buildAccessClaims({
      authUserId: 'user-1',
      provider: 'google',
      directoryData: {
        user_id: 'dir-1',
        organization_id: 'org-1',
        primary_role: 'EMPLOYEE',
        is_system_admin: false,
      },
    })

    assert.equal(claims.isTrainer, false)
    assert.equal(claims.isSystemAdmin, false)
    assert.equal(claims.primaryRole, 'EMPLOYEE')
  })

  it('buildAccessClaims sets isTrainer true from directory is_trainer', () => {
    const claims = buildAccessClaims({
      authUserId: 'user-2',
      provider: 'google',
      directoryData: {
        user_id: 'dir-2',
        organization_id: 'org-2',
        primary_role: 'HR',
        is_system_admin: false,
        is_trainer: true,
      },
    })

    assert.equal(claims.isTrainer, true)
    assert.equal(claims.primaryRole, 'HR')
    assert.equal(claims.isSystemAdmin, false)
  })

  it('buildAccessClaims preserves isSystemAdmin alongside isTrainer', () => {
    const claims = buildAccessClaims({
      authUserId: 'user-3',
      provider: 'google',
      directoryData: {
        user_id: 'dir-3',
        organization_id: '',
        primary_role: '',
        is_system_admin: true,
        is_trainer: false,
      },
    })

    assert.equal(claims.isSystemAdmin, true)
    assert.equal(claims.isTrainer, false)
  })

  it('signed JWT roundtrip includes isTrainer claim', () => {
    const claims = buildAccessClaims({
      authUserId: 'user-4',
      provider: 'github',
      directoryData: {
        user_id: 'dir-4',
        organization_id: 'org-4',
        primary_role: 'HR',
        is_system_admin: false,
        is_trainer: true,
      },
    })

    const token = signAccessToken(claims)
    const verified = verifyAccessToken(token)

    assert.equal(verified.isTrainer, true)
    assert.equal(verified.primaryRole, 'HR')
    assert.equal(verified.isSystemAdmin, false)
    assert.equal(verified.directoryUserId, 'dir-4')
  })
})
