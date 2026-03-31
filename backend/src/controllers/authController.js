import { AppError } from '../utils/AppError.js'
import { saveDirectoryLookupResult } from '../repositories/directoryLookupStore.js'
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
    const serverSideRecord = saveDirectoryLookupResult({
      providerIdentity,
      directoryData: lookupResult.directoryData,
      authState: lookupResult.authState,
    })

    clearOauthStateCookie(res)

    res.status(200).json({
      success: true,
      data: {
        providerIdentity,
        directoryData: lookupResult.directoryData,
        authState: lookupResult.authState,
        nextStep: lookupResult.nextStep,
        serverSideLookup: {
          lookup_id: serverSideRecord.id,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}
