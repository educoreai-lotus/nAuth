const DEFAULT_EMBED_URL = 'https://rag-production-3a4c.up.railway.app/embed/bot.js'
const DEFAULT_HOST_ID = 'NAUTH_PORTAL'
const GUEST_HOST_ID = 'NAUTH_PUBLIC'
const GUEST_INIT_KEY = `guest|${GUEST_HOST_ID}`
const SCRIPT_ATTR = 'data-educore-rag-embed'

let scriptPromise = null
let activeInitKey = null
let activeOwnerGeneration = null
let syncGeneration = 0

function isDev() {
  return Boolean(import.meta.env?.DEV)
}

function warn(message) {
  if (isDev()) {
    console.warn(`[nAuth][RAG] ${message}`)
  }
}

function isSyncCurrent(syncToken) {
  return syncToken == null || syncToken === syncGeneration
}

function containerExists() {
  return typeof document !== 'undefined' && Boolean(document.querySelector('#edu-bot-container'))
}

/** Advance the sync generation so only the latest lifecycle effect may initialize. */
export function nextRagSyncGeneration() {
  syncGeneration += 1
  return syncGeneration
}

export function getRagConfig() {
  const embedUrl = String(import.meta.env?.VITE_RAG_EMBED_URL || DEFAULT_EMBED_URL).trim()
  const hostId = String(import.meta.env?.VITE_RAG_HOST_ID || DEFAULT_HOST_ID).trim()

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

/**
 * Destroy the active Educore widget when this owner still owns it,
 * or when force=true (page unload / mode switch inside a current sync).
 */
export function destroyEducoreBotSafe(options = {}) {
  const { ownerGeneration = null, force = false } = options

  if (
    !force &&
    ownerGeneration != null &&
    activeOwnerGeneration != null &&
    ownerGeneration !== activeOwnerGeneration
  ) {
    return { status: 'skipped_stale_cleanup' }
  }

  try {
    if (typeof window !== 'undefined' && typeof window.destroyEducoreBot === 'function') {
      window.destroyEducoreBot()
    }
  } catch {
    warn('destroyEducoreBot failed; continuing without blocking nAuth.')
  } finally {
    activeInitKey = null
    activeOwnerGeneration = null
  }

  return { status: 'destroyed' }
}

export async function syncGuestEducoreBot({ syncToken = null } = {}) {
  const { embedUrl, enabled } = getRagConfig()

  if (!enabled) {
    destroyEducoreBotSafe({ ownerGeneration: syncToken, force: syncToken == null })
    return { status: 'disabled' }
  }

  if (!isSyncCurrent(syncToken)) {
    return { status: 'stale_sync_cancelled' }
  }

  if (activeInitKey === GUEST_INIT_KEY && typeof window.initializeEducoreBot === 'function') {
    if (syncToken != null) {
      activeOwnerGeneration = syncToken
    }
    return { status: 'already_initialized_guest' }
  }

  try {
    await ensureRagScriptLoaded(embedUrl)
  } catch (error) {
    if (!isSyncCurrent(syncToken)) {
      return { status: 'stale_sync_cancelled' }
    }
    warn(error?.message || 'RAG script load failed.')
    return { status: 'script_failed' }
  }

  if (!isSyncCurrent(syncToken)) {
    return { status: 'stale_sync_cancelled' }
  }

  if (typeof window.initializeEducoreBot !== 'function') {
    warn('initializeEducoreBot is unavailable after script load.')
    return { status: 'initializer_unavailable' }
  }

  if (!containerExists()) {
    warn('Skipping Guest RAG init: #edu-bot-container is missing.')
    return { status: 'container_missing' }
  }

  if (activeInitKey && activeInitKey !== GUEST_INIT_KEY) {
    destroyEducoreBotSafe({ force: true })
  }

  if (!isSyncCurrent(syncToken)) {
    return { status: 'stale_sync_cancelled' }
  }

  try {
    window.initializeEducoreBot({
      microservice: GUEST_HOST_ID,
      allowGuest: true,
    })
    activeInitKey = GUEST_INIT_KEY
    activeOwnerGeneration = syncToken
    return { status: 'initialized_guest' }
  } catch (error) {
    destroyEducoreBotSafe({ force: true })
    warn(error?.message || 'initializeEducoreBot Guest threw an error.')
    return { status: 'init_failed' }
  }
}

export async function syncAuthenticatedEducoreBot({ accessToken, syncToken = null }) {
  const { embedUrl, hostId, enabled } = getRagConfig()

  if (!enabled) {
    destroyEducoreBotSafe({ ownerGeneration: syncToken, force: syncToken == null })
    return { status: 'disabled' }
  }

  if (!isSyncCurrent(syncToken)) {
    return { status: 'stale_sync_cancelled' }
  }

  if (!accessToken) {
    destroyEducoreBotSafe({ ownerGeneration: syncToken, force: true })
    return { status: 'skipped_missing_token' }
  }

  const identity = resolveRagIdentity(accessToken)
  if (!identity) {
    destroyEducoreBotSafe({ force: true })
    warn('Skipping RAG init: access token payload could not be decoded.')
    return { status: 'skipped_malformed_token' }
  }

  if (!identity.userId) {
    destroyEducoreBotSafe({ force: true })
    warn('Skipping RAG init: directoryUserId missing from access token.')
    return { status: 'skipped_missing_user' }
  }

  if (!identity.tenantId) {
    destroyEducoreBotSafe({ force: true })
    warn('Skipping RAG init: organizationId missing from access token (no default tenant).')
    return { status: 'skipped_missing_tenant' }
  }

  const initKey = `${hostId}|${identity.initKey}`
  if (activeInitKey === initKey && typeof window.initializeEducoreBot === 'function') {
    if (syncToken != null) {
      activeOwnerGeneration = syncToken
    }
    return { status: 'already_initialized' }
  }

  try {
    await ensureRagScriptLoaded(embedUrl)
  } catch (error) {
    if (!isSyncCurrent(syncToken)) {
      return { status: 'stale_sync_cancelled' }
    }
    destroyEducoreBotSafe({ force: true })
    warn(error?.message || 'RAG script load failed.')
    return { status: 'script_failed' }
  }

  if (!isSyncCurrent(syncToken)) {
    return { status: 'stale_sync_cancelled' }
  }

  if (typeof window.initializeEducoreBot !== 'function') {
    destroyEducoreBotSafe({ force: true })
    warn('initializeEducoreBot is unavailable after script load.')
    return { status: 'initializer_unavailable' }
  }

  if (!containerExists()) {
    warn('Skipping authenticated RAG init: #edu-bot-container is missing.')
    return { status: 'container_missing' }
  }

  if (activeInitKey && activeInitKey !== initKey) {
    destroyEducoreBotSafe({ force: true })
  }

  if (!isSyncCurrent(syncToken)) {
    return { status: 'stale_sync_cancelled' }
  }

  try {
    window.initializeEducoreBot({
      microservice: hostId,
      userId: identity.userId,
      token: accessToken,
      tenantId: identity.tenantId,
    })
    activeInitKey = initKey
    activeOwnerGeneration = syncToken
    return { status: 'initialized' }
  } catch (error) {
    destroyEducoreBotSafe({ force: true })
    warn(error?.message || 'initializeEducoreBot threw an error.')
    return { status: 'init_failed' }
  }
}

/**
 * Synchronize Educore bot to authenticated or Guest mode.
 * Authenticated state always wins; never falls back to Guest while authenticated.
 */
export async function syncEducoreBot({ accessToken, isAuthenticated, syncToken = null }) {
  const { enabled } = getRagConfig()

  if (!enabled) {
    destroyEducoreBotSafe({ ownerGeneration: syncToken, force: syncToken == null })
    return { status: 'disabled' }
  }

  if (!isSyncCurrent(syncToken)) {
    return { status: 'stale_sync_cancelled' }
  }

  if (isAuthenticated) {
    return syncAuthenticatedEducoreBot({ accessToken, syncToken })
  }

  return syncGuestEducoreBot({ syncToken })
}

/** Test-only: reset module-level RAG host state. */
export function __resetRagBotForTests() {
  scriptPromise = null
  activeInitKey = null
  activeOwnerGeneration = null
  syncGeneration = 0
}
