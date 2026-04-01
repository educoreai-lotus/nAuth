import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { logoutRequest, refreshAccessToken } from '../services/authApi'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState(null)
  const [authState, setAuthState] = useState(null)
  const [error, setError] = useState(null)

  const isAuthenticated = Boolean(accessToken && authState === 'AUTHENTICATED_LINKED')
  const isExpectedUnauthenticated = useCallback((result) => result?.status === 401, [])

  const bootstrapAuth = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await refreshAccessToken()

    if (result.ok) {
      setAccessToken(result.data?.data?.accessToken || null)
      setAuthState(result.data?.data?.authState || null)
      setError(null)
    } else {
      setAccessToken(null)
      setAuthState(null)
      if (isExpectedUnauthenticated(result)) {
        setError(null)
      } else {
        setError(result.data?.error?.message || 'Unable to restore auth session.')
      }
    }

    setLoading(false)
    return result.ok
  }, [isExpectedUnauthenticated])

  const setDecisionState = useCallback((stateCode) => {
    setAccessToken(null)
    setAuthState(stateCode || null)
    setError(null)
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setAccessToken(null)
    setAuthState(null)
    setError(null)
  }, [])

  useEffect(() => {
    void bootstrapAuth()
  }, [bootstrapAuth])

  const value = useMemo(
    () => ({
      loading,
      isAuthenticated,
      accessToken,
      authState,
      error,
      refresh: bootstrapAuth,
      logout,
      setDecisionState,
    }),
    [loading, isAuthenticated, accessToken, authState, error, bootstrapAuth, logout, setDecisionState],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
