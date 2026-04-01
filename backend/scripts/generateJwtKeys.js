import { generateKeyPairSync } from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const keysDir = path.resolve(__dirname, '../keys')
const privateKeyPath = path.join(keysDir, 'jwt-private.pem')
const publicKeyPath = path.join(keysDir, 'jwt-public.pem')

function run() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  fs.mkdirSync(keysDir, { recursive: true })
  fs.writeFileSync(privateKeyPath, privateKey, { encoding: 'utf8', mode: 0o600 })
  fs.writeFileSync(publicKeyPath, publicKey, { encoding: 'utf8' })

  console.log('JWT RSA key pair generated successfully.')
  console.log(`Private key saved to: ${privateKeyPath}`)
  console.log(`Public key saved to: ${publicKeyPath}`)
  console.log('Next steps:')
  console.log('1) Copy backend/keys/jwt-private.pem into Railway ENV: JWT_PRIVATE_KEY')
  console.log('2) Copy backend/keys/jwt-public.pem into Railway ENV: JWT_PUBLIC_KEY')
}

run()
