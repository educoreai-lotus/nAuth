import crypto from 'crypto'
import { AppError } from './AppError.js'

export function createSignedCoordinatorHeaders(payload) {
  const privateKey = process.env.NAUTH_PRIVATE_KEY

  if (!privateKey) {
    throw new AppError('Missing required environment variable: NAUTH_PRIVATE_KEY', 500)
  }

  const normalizedPrivateKey = privateKey.includes('\\n')
    ? privateKey.replace(/\\n/g, '\n')
    : privateKey

  const payloadString = JSON.stringify(payload)
  const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex')
  const message = `educoreai-nAuth-${payloadHash}`

  const signer = crypto.createSign('SHA256')
  signer.update(message)
  signer.end()

  const signature = signer.sign(normalizedPrivateKey).toString('base64')

  return {
    'Content-Type': 'application/json',
    'X-Service-Name': 'nAuth',
    'X-Signature': signature,
  }
}
