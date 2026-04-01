import crypto from 'crypto'

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url')
}

export function hashRefreshToken(refreshToken) {
  return crypto.createHash('sha256').update(refreshToken).digest('hex')
}
