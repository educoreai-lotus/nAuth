const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL

function buildUrl(path) {
  return `${BACKEND_BASE_URL}${path}`
}

async function parseJsonResponse(response) {
  const data = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, data }
}

export function getGoogleLoginUrl() {
  return buildUrl('/auth/google/start')
}

export function getGithubLoginUrl() {
  return buildUrl('/auth/github/start')
}

export async function refreshAccessToken() {
  const response = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return parseJsonResponse(response)
}

export async function logoutRequest() {
  const response = await fetch(buildUrl('/auth/logout'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return parseJsonResponse(response)
}
