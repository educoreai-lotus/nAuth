const DEFAULT_EMBED_URL = 'https://rag-production-3a4c.up.railway.app/embed/bot.js'
const DEFAULT_HOST_ID = 'NAUTH_PORTAL'
const SCRIPT_ATTR = 'data-educore-rag-embed'

let scriptPromise = null
let activeInitKey = null

function isDev() {
  return Boolean(import.meta.env.DEV)
}

function warn(message) {
  if (isDev()) {
    console.warn(`[nAuth][RAG] ${message}`)
  }
}

export function getRagConfig() {
  const embedUrl = String(import.meta.env.VITE_RAG_EMBED_URL || DEFAULT_EMBED_URL).trim()
  const hostId = String(import.meta.env.VITE_RAG_HOST_ID || DEFAULT_HOST_ID).trim()

  return {
    embedUrl,
    hostId,
    enabled: Boolean(embedUrl && hostId),
  }
}

/**
 * Decode JWT payload for host metadata only.
 * This is not signature verification — RAG validates the Bearer token.
 */
export function decodeAccessTokenPayload(token) {
  if (!token || typeof token !== 'string') {
    return null
  }

  try {
    const parts = token.split('.')
    if (parts.length < 2) {
      return null
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function resolveRagIdentity(accessToken) {
  const payload = decodeAccessTokenPayload(accessToken)
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const userId = String(payload.directoryUserId || '').trim()
  const tenantId = String(payload.organizationId || '').trim()

  return {
    userId,
    tenantId,
    initKey: `${userId}|${tenantId}|${payload.sub || ''}|${payload.iat || ''}`,
  }
}

export function ensureRagScriptLoaded(embedUrl) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('RAG script requires a browser environment.'))
  }

  if (typeof window.initializeEducoreBot === 'function') {
    return Promise.resolve()
  }

  const existing = document.querySelector(`script[${SCRIPT_ATTR}="true"]`)
  if (existing && typeof window.initializeEducoreBot === 'function') {
    return Promise.resolve()
  }

  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise((resolve, reject) => {
    if (existing) {
      const pollStarted = Date.now()
      const poll = window.setInterval(() => {
        if (typeof window.initializeEducoreBot === 'function') {
          window.clearInterval(poll)
          resolve()
        } else if (Date.now() - pollStarted > 15000) {
          window.clearInterval(poll)
          scriptPromise = null
          reject(new Error('RAG embed script did not expose initializeEducoreBot.'))
        }
      }, 50)
      return
    }

    const script = document.createElement('script')
    script.src = embedUrl
    script.async = true
    script.setAttribute(SCRIPT_ATTR, 'true')

    script.onload = () => {
      if (typeof window.initializeEducoreBot === 'function') {
        resolve()
        return
      }

      const pollStarted = Date.now()
      const poll = window.setInterval(() => {
        if (typeof window.initializeEducoreBot === 'function') {
          window.clearInterval(poll)
          resolve()
        } else if (Date.now() - pollStarted > 10000) {
          window.clearInterval(poll)
          scriptPromise = null
          reject(new Error('RAG embed script loaded but initializeEducoreBot is unavailable.'))
        }
      }, 50)
    }

    script.onerror = () => {
      scriptPromise = null
      script.remove()
      reject(new Error('Failed to load RAG embed script.'))
    }

    document.body.appendChild(script)
  })

  return scriptPromise
}

export function destroyEducoreBotSafe() {
  try {
    if (typeof window !== 'undefined' && typeof window.destroyEducoreBot === 'function') {
      window.destroyEducoreBot()
    }
  } catch {
    warn('destroyEducoreBot failed; continuing without blocking nAuth.')
  } finally {
    activeInitKey = null
  }
}

export async function syncEducoreBot({ accessToken, isAuthenticated }) {
  const { embedUrl, hostId, enabled } = getRagConfig()

  if (!enabled) {
    destroyEducoreBotSafe()
    return { status: 'disabled' }
  }

  if (!isAuthenticated || !accessToken) {
    destroyEducoreBotSafe()
    return { status: 'skipped_unauthenticated' }
  }

  const identity = resolveRagIdentity(accessToken)
  if (!identity) {
    destroyEducoreBotSafe()
    warn('Skipping RAG init: access token payload could not be decoded.')
    return { status: 'skipped_malformed_token' }
  }

  if (!identity.userId) {
    destroyEducoreBotSafe()
    warn('Skipping RAG init: directoryUserId missing from access token.')
    return { status: 'skipped_missing_user' }
  }

  if (!identity.tenantId) {
    destroyEducoreBotSafe()
    warn('Skipping RAG init: organizationId missing from access token (no default tenant).')
    return { status: 'skipped_missing_tenant' }
  }

  const initKey = `${hostId}|${identity.initKey}`
  if (activeInitKey === initKey && typeof window.initializeEducoreBot === 'function') {
    return { status: 'already_initialized' }
  }

  try {
    await ensureRagScriptLoaded(embedUrl)
  } catch (error) {
    destroyEducoreBotSafe()
    warn(error?.message || 'RAG script load failed.')
    return { status: 'script_failed' }
  }

  if (typeof window.initializeEducoreBot !== 'function') {
    destroyEducoreBotSafe()
    warn('initializeEducoreBot is unavailable after script load.')
    return { status: 'initializer_unavailable' }
  }

  if (activeInitKey && activeInitKey !== initKey) {
    destroyEducoreBotSafe()
  }

  try {
    window.initializeEducoreBot({
      microservice: hostId,
      userId: identity.userId,
      token: accessToken,
      tenantId: identity.tenantId,
    })
    activeInitKey = initKey
    return { status: 'initialized' }
  } catch (error) {
    destroyEducoreBotSafe()
    warn(error?.message || 'initializeEducoreBot threw an error.')
    return { status: 'init_failed' }
  }
}
