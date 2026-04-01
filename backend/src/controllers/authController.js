import { AppError } from '../utils/AppError.js'
import { config } from '../config/env.js'
import { saveDirectoryLookupResult } from '../repositories/directoryLookupStore.js'
import {
  clearRefreshCookie,
  createAuthenticatedSession,
  logoutAuthenticatedSession,
  refreshAuthenticatedSession,
  setRefreshCookie,
} from '../services/authSessionService.js'
import { lookupUserViaCoordinator } from '../services/coordinator/directoryLookupService.js'
import {
  buildProviderAuthorizationUrl,
  clearOauthStateCookie,
  exchangeCodeAndFetchIdentity,
  setOauthStateCookie,
  validateAndConsumeState,
} from '../services/oauth/oauthService.js'

export function oauthStartController(req, res, next) {
  try {
    const { provider } = req.params
    const { authorizationUrl, state } = buildProviderAuthorizationUrl(provider)

    setOauthStateCookie(res, state)
    res.redirect(302, authorizationUrl)
  } catch (error) {
    next(error)
  }
}

export async function oauthCallbackController(req, res, next) {
  try {
    const { provider } = req.params
    const { code, state } = req.query

    if (!code || !state) {
      throw new AppError('Missing OAuth callback parameters.', 400)
    }

    validateAndConsumeState({
      provider,
      stateFromQuery: String(state),
      cookieHeader: req.headers.cookie || '',
    })

    const providerIdentity = await exchangeCodeAndFetchIdentity({
      provider,
      authorizationCode: String(code),
    })

    const lookupResult = await lookupUserViaCoordinator(providerIdentity)
    saveDirectoryLookupResult({
      providerIdentity,
      directoryData: lookupResult.directoryData,
      authState: lookupResult.authState,
    })

    if (lookupResult.authState === 'AUTHENTICATED_LINKED') {
      const authSession = await createAuthenticatedSession({
        providerIdentity,
        directoryData: lookupResult.directoryData,
        authDecisionState: lookupResult.authState,
        requestMeta: {
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
          deviceFingerprint: req.headers['x-device-fingerprint'] || null,
        },
      })

      setRefreshCookie(res, authSession.rawRefreshToken)
      clearOauthStateCookie(res)
      res.redirect(`${config.frontendBaseUrl}/auth/callback?result=success`)
      return
    }

    clearOauthStateCookie(res)
    if (lookupResult.authState === 'USER_NOT_FOUND') {
      res.redirect(`${config.frontendBaseUrl}/waiting-approval`)
      return
    }

    const safeDecisionState = [
      'AUTHENTICATED_NO_ORG',
      'LOOKUP_FAILED',
    ].includes(lookupResult.authState)
      ? lookupResult.authState
      : 'LOOKUP_FAILED'

    res.redirect(
      `${config.frontendBaseUrl}/auth/callback?result=decision&authState=${encodeURIComponent(
        safeDecisionState,
      )}`,
    )
  } catch (error) {
    next(error)
  }
}

export async function refreshController(req, res, next) {
  try {
    const refreshed = await refreshAuthenticatedSession(req.headers.cookie || '')
    setRefreshCookie(res, refreshed.rawRefreshToken)

    res.status(200).json({
      success: true,
      data: {
        authState: refreshed.authState,
        accessToken: refreshed.accessToken,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function logoutController(req, res, next) {
  try {
    await logoutAuthenticatedSession(req.headers.cookie || '')
    clearRefreshCookie(res)

    res.status(200).json({
      success: true,
      data: {
        loggedOut: true,
      },
    })
  } catch (error) {
    next(error)
  }
}
