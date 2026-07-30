import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, mock } from 'node:test'

/**
 * Focused node:test coverage for the isolated RAG host service.
 * Run: node --test src/services/ragBot.test.js
 */

function encodeJwtPayload(payload) {
  const json = JSON.stringify(payload)
  const b64 = globalThis.Buffer.from(json, 'utf8').toString('base64')
  return `hdr.${b64.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.sig`
}

function createScriptElement() {
  const attrs = {}
  return {
    src: '',
    async: false,
    onload: null,
    onerror: null,
    setAttribute(key, value) {
      attrs[key] = String(value)
    },
    getAttribute(key) {
      return Object.prototype.hasOwnProperty.call(attrs, key) ? attrs[key] : null
    },
    remove() {},
  }
}

function installBrowserMocks({ withContainer = true, autoExposeInitializer = true } = {}) {
  const scripts = []
  const initializeEducoreBot = mock.fn()
  const destroyEducoreBot = mock.fn()

  const body = {
    appendChild(node) {
      scripts.push(node)
      queueMicrotask(() => {
        if (autoExposeInitializer) {
          globalThis.window.initializeEducoreBot = initializeEducoreBot
        }
        if (typeof node.onload === 'function') {
          node.onload()
        }
      })
    },
  }

  const container = withContainer ? { id: 'edu-bot-container' } : null

  globalThis.document = {
    body,
    createElement(tagName) {
      if (tagName === 'script') {
        return createScriptElement()
      }
      return { tagName }
    },
    querySelector(selector) {
      if (selector === '#edu-bot-container') {
        return container
      }
      if (selector === 'script[data-educore-rag-embed="true"]') {
        return scripts.find((s) => s.getAttribute?.('data-educore-rag-embed') === 'true') || null
      }
      return null
    },
  }

  globalThis.window = {
    setInterval,
    clearInterval,
    destroyEducoreBot,
  }

  globalThis.atob = (value) => globalThis.Buffer.from(value, 'base64').toString('utf8')

  return { scripts, initializeEducoreBot, destroyEducoreBot }
}

describe('ragBot guest and authenticated sync', () => {
  let ragBot

  beforeEach(async () => {
    installBrowserMocks()
    ragBot = await import('./ragBot.js')
    ragBot.__resetRagBotForTests()
  })

  afterEach(() => {
    ragBot.__resetRagBotForTests()
    delete globalThis.window
    delete globalThis.document
    delete globalThis.atob
  })

  it('unauthenticated initializes Guest with NAUTH_PUBLIC and allowGuest only', async () => {
    const { initializeEducoreBot, scripts } = installBrowserMocks()
    ragBot.__resetRagBotForTests()

    const result = await ragBot.syncEducoreBot({
      accessToken: null,
      isAuthenticated: false,
      syncToken: ragBot.nextRagSyncGeneration(),
    })

    assert.equal(result.status, 'initialized_guest')
    assert.equal(initializeEducoreBot.mock.calls.length, 1)
    assert.deepEqual(initializeEducoreBot.mock.calls[0].arguments[0], {
      microservice: 'NAUTH_PUBLIC',
      allowGuest: true,
    })
    const args = initializeEducoreBot.mock.calls[0].arguments[0]
    assert.equal('token' in args, false)
    assert.equal('userId' in args, false)
    assert.equal('tenantId' in args, false)
    assert.equal(scripts.length, 1)
  })

  it('unauthenticated second sync is already_initialized_guest without duplicate init', async () => {
    const { initializeEducoreBot, scripts } = installBrowserMocks()
    ragBot.__resetRagBotForTests()

    const syncToken = ragBot.nextRagSyncGeneration()
    const first = await ragBot.syncEducoreBot({
      accessToken: null,
      isAuthenticated: false,
      syncToken,
    })
    const second = await ragBot.syncEducoreBot({
      accessToken: null,
      isAuthenticated: false,
      syncToken,
    })

    assert.equal(first.status, 'initialized_guest')
    assert.equal(second.status, 'already_initialized_guest')
    assert.equal(initializeEducoreBot.mock.calls.length, 1)
    assert.equal(scripts.length, 1)
  })

  it('authenticated path wins and never calls Guest initializer', async () => {
    const { initializeEducoreBot } = installBrowserMocks()
    ragBot.__resetRagBotForTests()

    const token = encodeJwtPayload({
      directoryUserId: 'dir-1',
      organizationId: 'org-1',
      sub: 'user-1',
      iat: 1,
    })

    const result = await ragBot.syncEducoreBot({
      accessToken: token,
      isAuthenticated: true,
      syncToken: ragBot.nextRagSyncGeneration(),
    })

    assert.equal(result.status, 'initialized')
    assert.equal(initializeEducoreBot.mock.calls.length, 1)
    assert.deepEqual(initializeEducoreBot.mock.calls[0].arguments[0], {
      microservice: 'NAUTH_PORTAL',
      userId: 'dir-1',
      token,
      tenantId: 'org-1',
    })
    assert.equal('allowGuest' in initializeEducoreBot.mock.calls[0].arguments[0], false)
  })

  it('authenticated incomplete identity does not fall back to Guest', async () => {
    const { initializeEducoreBot } = installBrowserMocks()
    ragBot.__resetRagBotForTests()

    const token = encodeJwtPayload({
      directoryUserId: 'dir-1',
      organizationId: '',
      sub: 'user-1',
      iat: 1,
    })

    const result = await ragBot.syncEducoreBot({
      accessToken: token,
      isAuthenticated: true,
      syncToken: ragBot.nextRagSyncGeneration(),
    })

    assert.equal(result.status, 'skipped_missing_tenant')
    assert.equal(initializeEducoreBot.mock.calls.length, 0)
  })

  it('Guest → authenticated destroys Guest then initializes authenticated once', async () => {
    const { initializeEducoreBot, destroyEducoreBot } = installBrowserMocks()
    ragBot.__resetRagBotForTests()

    await ragBot.syncEducoreBot({
      accessToken: null,
      isAuthenticated: false,
      syncToken: ragBot.nextRagSyncGeneration(),
    })

    const token = encodeJwtPayload({
      directoryUserId: 'dir-2',
      organizationId: 'org-2',
      sub: 'user-2',
      iat: 2,
    })

    const result = await ragBot.syncEducoreBot({
      accessToken: token,
      isAuthenticated: true,
      syncToken: ragBot.nextRagSyncGeneration(),
    })

    assert.equal(result.status, 'initialized')
    assert.equal(destroyEducoreBot.mock.calls.length, 1)
    assert.equal(initializeEducoreBot.mock.calls.length, 2)
    assert.deepEqual(initializeEducoreBot.mock.calls[0].arguments[0], {
      microservice: 'NAUTH_PUBLIC',
      allowGuest: true,
    })
    assert.deepEqual(initializeEducoreBot.mock.calls[1].arguments[0], {
      microservice: 'NAUTH_PORTAL',
      userId: 'dir-2',
      token,
      tenantId: 'org-2',
    })
  })

  it('authenticated → Guest destroys auth widget and initializes Guest without auth values', async () => {
    const { initializeEducoreBot, destroyEducoreBot } = installBrowserMocks()
    ragBot.__resetRagBotForTests()

    const token = encodeJwtPayload({
      directoryUserId: 'dir-3',
      organizationId: 'org-3',
      sub: 'user-3',
      iat: 3,
    })

    await ragBot.syncEducoreBot({
      accessToken: token,
      isAuthenticated: true,
      syncToken: ragBot.nextRagSyncGeneration(),
    })

    const result = await ragBot.syncEducoreBot({
      accessToken: null,
      isAuthenticated: false,
      syncToken: ragBot.nextRagSyncGeneration(),
    })

    assert.equal(result.status, 'initialized_guest')
    assert.equal(destroyEducoreBot.mock.calls.length, 1)
    assert.deepEqual(initializeEducoreBot.mock.calls[1].arguments[0], {
      microservice: 'NAUTH_PUBLIC',
      allowGuest: true,
    })
  })

  it('stale Guest async completion is ignored after a newer sync generation', async () => {
    const { scripts, initializeEducoreBot } = installBrowserMocks({ autoExposeInitializer: false })
    ragBot.__resetRagBotForTests()

    let finishScriptLoad = null
    globalThis.document.body.appendChild = (node) => {
      scripts.push(node)
      finishScriptLoad = () => {
        globalThis.window.initializeEducoreBot = initializeEducoreBot
        if (typeof node.onload === 'function') {
          node.onload()
        }
      }
    }

    const staleToken = ragBot.nextRagSyncGeneration()
    const stalePromise = ragBot.syncGuestEducoreBot({ syncToken: staleToken })

    await Promise.resolve()
    assert.equal(typeof finishScriptLoad, 'function')

    const freshToken = ragBot.nextRagSyncGeneration()
    finishScriptLoad()

    const fresh = await ragBot.syncEducoreBot({
      accessToken: null,
      isAuthenticated: false,
      syncToken: freshToken,
    })
    const stale = await stalePromise

    assert.equal(fresh.status, 'initialized_guest')
    assert.equal(stale.status, 'stale_sync_cancelled')
    assert.equal(initializeEducoreBot.mock.calls.length, 1)
    assert.deepEqual(initializeEducoreBot.mock.calls[0].arguments[0], {
      microservice: 'NAUTH_PUBLIC',
      allowGuest: true,
    })
  })

  it('stale cleanup does not destroy a newer widget', async () => {
    const { destroyEducoreBot } = installBrowserMocks()
    ragBot.__resetRagBotForTests()

    const firstToken = ragBot.nextRagSyncGeneration()
    await ragBot.syncEducoreBot({
      accessToken: null,
      isAuthenticated: false,
      syncToken: firstToken,
    })

    const secondToken = ragBot.nextRagSyncGeneration()
    await ragBot.syncEducoreBot({
      accessToken: null,
      isAuthenticated: false,
      syncToken: secondToken,
    })

    const staleCleanup = ragBot.destroyEducoreBotSafe({ ownerGeneration: firstToken })
    assert.equal(staleCleanup.status, 'skipped_stale_cleanup')
    assert.equal(destroyEducoreBot.mock.calls.length, 0)

    const currentCleanup = ragBot.destroyEducoreBotSafe({ ownerGeneration: secondToken })
    assert.equal(currentCleanup.status, 'destroyed')
    assert.equal(destroyEducoreBot.mock.calls.length, 1)
  })

  it('script failure is isolated and later sync can retry', async () => {
    const failing = installBrowserMocks({ autoExposeInitializer: false })
    ragBot.__resetRagBotForTests()

    globalThis.document.body.appendChild = (node) => {
      failing.scripts.push(node)
      queueMicrotask(() => {
        if (typeof node.onerror === 'function') {
          node.onerror()
        }
      })
    }

    const failed = await ragBot.syncEducoreBot({
      accessToken: null,
      isAuthenticated: false,
      syncToken: ragBot.nextRagSyncGeneration(),
    })
    assert.equal(failed.status, 'script_failed')

    const restored = installBrowserMocks()
    ragBot.__resetRagBotForTests()
    const ok = await ragBot.syncEducoreBot({
      accessToken: null,
      isAuthenticated: false,
      syncToken: ragBot.nextRagSyncGeneration(),
    })
    assert.equal(ok.status, 'initialized_guest')
    assert.equal(restored.initializeEducoreBot.mock.calls.length, 1)
  })

  it('duplicate sync reuses one script tag', async () => {
    const { scripts, initializeEducoreBot } = installBrowserMocks()
    ragBot.__resetRagBotForTests()

    await ragBot.syncEducoreBot({
      accessToken: null,
      isAuthenticated: false,
      syncToken: ragBot.nextRagSyncGeneration(),
    })
    await ragBot.syncEducoreBot({
      accessToken: null,
      isAuthenticated: false,
      syncToken: ragBot.nextRagSyncGeneration(),
    })

    assert.equal(scripts.length, 1)
    assert.equal(initializeEducoreBot.mock.calls.length, 1)
  })
})
