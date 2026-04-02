import jwt from 'jsonwebtoken'
import { AppError } from './AppError.js'

const ACCESS_TOKEN_TTL = '15m'

function getJwtConfig() {
  const privateKey = process.env.JWT_PRIVATE_KEY
  const publicKey = process.env.JWT_PUBLIC_KEY
  const issuer = process.env.JWT_ISSUER
  const audience = process.env.JWT_AUDIENCE

  if (!privateKey || !publicKey || !issuer || !audience) {
    throw new AppError(
      'Missing JWT configuration. Required: JWT_PRIVATE_KEY, JWT_PUBLIC_KEY, JWT_ISSUER, JWT_AUDIENCE.',
      500,
    )
  }

  return {
    privateKey: privateKey.replace(/\\n/g, '\n'),
    publicKey: publicKey.replace(/\\n/g, '\n'),
    issuer,
    audience,
  }
}

export function signAccessToken(claims) {
  const { privateKey, issuer, audience } = getJwtConfig()

  return jwt.sign(claims, privateKey, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_TTL,
    issuer,
    audience,
  })
}

export function verifyAccessToken(token) {
  const { publicKey, issuer, audience } = getJwtConfig()
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer,
    audience,
  })
}

export function verifyAccessTokenIgnoreExpiration(token) {
  const { publicKey, issuer, audience } = getJwtConfig()
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer,
    audience,
    ignoreExpiration: true,
  })
}
