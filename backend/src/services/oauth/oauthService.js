import crypto from 'crypto'
import { config } from '../../config/env.js'
import { AppError } from '../../utils/AppError.js'
import { consumeOauthState, putOauthState } from './stateStore.js'
import { OAUTH_PROVIDER_CONFIG, SUPPORTED_PROVIDERS } from './providers.js'

const OAUTH_STATE_COOKIE = 'nauth_oauth_state'

function parseCookies(cookieHeader) {
  const cookieEntries = cookieHeader
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => chunk.split('='))
    .filter(([key]) => key)

  return Object.fromEntries(cookieEntries.map(([key, value]) => [key, decodeURIComponent(value || '')]))
}

function assertSupportedProvider(provider) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new AppError(`Unsupported OAuth provider: ${provider}`, 400)
  }
}

function getProviderConfig(provider) {
  assertSupportedProvider(provider)

  const providerConfig = OAUTH_PROVIDER_CONFIG[provider]
  const clientId = process.env[providerConfig.clientIdEnv]
  const clientSecret = process.env[providerConfig.clientSecretEnv]

  if (!clientId || !clientSecret) {
    throw new AppError(`Missing OAuth configuration for provider: ${provider}`, 500)
  }

  return {
    ...providerConfig,
    clientId,
    clientSecret,
  }
}

function getProviderCallbackUrl(provider) {
  return `${config.backendBaseUrl}/auth/${provider}/callback`
}

function buildGoogleAuthUrl({ clientId, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getProviderCallbackUrl('google'),
    response_type: 'code',
    scope: OAUTH_PROVIDER_CONFIG.google.scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  return `${OAUTH_PROVIDER_CONFIG.google.authorizeUrl}?${params.toString()}`
}

function buildGithubAuthUrl({ clientId, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getProviderCallbackUrl('github'),
    scope: OAUTH_PROVIDER_CONFIG.github.scopes.join(' '),
    state,
  })

  return `${OAUTH_PROVIDER_CONFIG.github.authorizeUrl}?${params.toString()}`
}

function createStateValue() {
  return crypto.randomBytes(24).toString('hex')
}

async function fetchJson(url, options, errorMessage) {
  const response = await fetch(url, options)

  if (!response.ok) {
    const body = await response.text()
    throw new AppError(errorMessage, 502, { status: response.status, body })
  }

  return response.json()
}

async function exchangeGoogleCode({ code, clientId, clientSecret }) {
  const payload = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getProviderCallbackUrl('google'),
    grant_type: 'authorization_code',
  })

  return fetchJson(
    OAUTH_PROVIDER_CONFIG.google.tokenUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    },
    'Google token exchange failed.',
  )
}

async function exchangeGithubCode({ code, clientId, clientSecret }) {
  const payload = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getProviderCallbackUrl('github'),
  })

  return fetchJson(
    OAUTH_PROVIDER_CONFIG.github.tokenUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: payload.toString(),
    },
    'GitHub token exchange failed.',
  )
}

async function fetchGoogleProfile(accessToken) {
  return fetchJson(
    OAUTH_PROVIDER_CONFIG.google.userInfoUrl,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    'Google profile fetch failed.',
  )
}

async function fetchGithubProfile(accessToken) {
  const [userProfile, emailRecords] = await Promise.all([
    fetchJson(
      OAUTH_PROVIDER_CONFIG.github.userInfoUrl,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      },
      'GitHub profile fetch failed.',
    ),
    fetchJson(
      OAUTH_PROVIDER_CONFIG.github.userEmailsUrl,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      },
      'GitHub email fetch failed.',
    ),
  ])

  const primaryEmailRecord = Array.isArray(emailRecords)
    ? emailRecords.find((record) => record.primary) || emailRecords[0]
    : null

  return {
    userProfile,
    primaryEmail: primaryEmailRecord?.email || null,
  }
}

function normalizeGoogleIdentity(profile) {
  return {
    provider: 'google',
    provider_user_id: String(profile.sub),
    email: profile.email || null,
    display_name: profile.name || null,
    github_profile_url: null,
    provider_metadata: {
      email_verified: Boolean(profile.email_verified),
      picture: profile.picture || null,
      locale: profile.locale || null,
    },
  }
}

function normalizeGithubIdentity({ userProfile, primaryEmail }) {
  return {
    provider: 'github',
    provider_user_id: String(userProfile.id),
    email: primaryEmail || userProfile.email || null,
    display_name: userProfile.name || userProfile.login || null,
    github_profile_url: userProfile.html_url || null,
    provider_metadata: {
      login: userProfile.login || null,
      avatar_url: userProfile.avatar_url || null,
      profile_url: userProfile.url || null,
    },
  }
}

export function setOauthStateCookie(res, state) {
  // Temporary state cookie for callback CSRF protection.
  // Cookie strategy is not production-final yet.
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/',
  })
}

export function clearOauthStateCookie(res) {
  res.clearCookie(OAUTH_STATE_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  })
}

export function buildProviderAuthorizationUrl(provider) {
  const providerConfig = getProviderConfig(provider)
  const state = createStateValue()

  putOauthState(state, {
    provider,
    createdAt: new Date().toISOString(),
  })

  const authorizationUrl =
    provider === 'google'
      ? buildGoogleAuthUrl({ clientId: providerConfig.clientId, state })
      : buildGithubAuthUrl({ clientId: providerConfig.clientId, state })

  return { authorizationUrl, state }
}

export function validateAndConsumeState({ provider, stateFromQuery, cookieHeader }) {
  assertSupportedProvider(provider)

  const cookies = parseCookies(cookieHeader)
  const cookieState = cookies[OAUTH_STATE_COOKIE]
  const stateEntry = consumeOauthState(stateFromQuery)

  if (!cookieState || !stateEntry) {
    throw new AppError('Invalid or expired OAuth state.', 400)
  }

  if (stateEntry.provider !== provider || cookieState !== stateFromQuery) {
    throw new AppError('OAuth state mismatch.', 400)
  }
}

export async function exchangeCodeAndFetchIdentity({ provider, authorizationCode }) {
  const providerConfig = getProviderConfig(provider)

  try {
    if (provider === 'google') {
      const tokenResponse = await exchangeGoogleCode({
        code: authorizationCode,
        clientId: providerConfig.clientId,
        clientSecret: providerConfig.clientSecret,
      })

      const profile = await fetchGoogleProfile(tokenResponse.access_token)
      return normalizeGoogleIdentity(profile)
    }

    const tokenResponse = await exchangeGithubCode({
      code: authorizationCode,
      clientId: providerConfig.clientId,
      clientSecret: providerConfig.clientSecret,
    })

    const profile = await fetchGithubProfile(tokenResponse.access_token)
    return normalizeGithubIdentity(profile)
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError('Provider callback processing failed.', 502)
  }
}
