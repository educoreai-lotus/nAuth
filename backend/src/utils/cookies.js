export const REFRESH_COOKIE_NAME = 'nauth_refresh_token'

function parseCookieSecureFlag() {
  const value = process.env.COOKIE_SECURE
  if (!value) {
    return process.env.NODE_ENV === 'production'
  }
  return value === 'true' || value === '1'
}

function parseCookieSameSite() {
  const raw = process.env.COOKIE_SAME_SITE
  const value = (raw || (process.env.NODE_ENV === 'production' ? 'none' : 'lax')).toLowerCase()
  if (['lax', 'strict', 'none'].includes(value)) {
    return value
  }

  return 'lax'
}

export function getRefreshCookieOptions() {
  const options = {
    httpOnly: true,
    secure: parseCookieSecureFlag(),
    sameSite: parseCookieSameSite(),
    path: '/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  }

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN
  }

  return options
}

export function parseCookies(cookieHeader = '') {
  const entries = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split('='))
    .filter(([key]) => key)

  return Object.fromEntries(entries.map(([key, value]) => [key, decodeURIComponent(value || '')]))
}
