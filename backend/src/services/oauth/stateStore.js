const STATE_TTL_MS = 10 * 60 * 1000
const stateMap = new Map()

function now() {
  return Date.now()
}

function isExpired(entry) {
  return !entry || entry.expiresAt <= now()
}

export function putOauthState(state, payload) {
  stateMap.set(state, {
    ...payload,
    expiresAt: now() + STATE_TTL_MS,
  })
}

export function consumeOauthState(state) {
  const entry = stateMap.get(state)

  if (isExpired(entry)) {
    stateMap.delete(state)
    return null
  }

  stateMap.delete(state)
  return entry
}
