import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { refreshAccessToken } from '../services/authApi'
import { DIRECTORY_FRONTEND_URL } from '../constants/directory'

function AuthCallbackPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh, setDecisionState } = useAuth()

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(location.search)
      const result = params.get('result')

      if (result === 'success') {
        const refreshResult = await refreshAccessToken()
        if (refreshResult.ok) {
          const accessToken = refreshResult.data?.data?.accessToken
          if (accessToken) {
            window.location.href = `${DIRECTORY_FRONTEND_URL}#access_token=${encodeURIComponent(accessToken)}`
          } else {
            navigate('/login', { replace: true })
          }
        } else {
          navigate('/login', { replace: true })
        }
        return
      }

      if (result === 'decision') {
        const authState = params.get('authState')
        if (authState === 'USER_NOT_FOUND') {
          setDecisionState(authState)
          navigate('/waiting-approval', { replace: true })
          return
        }

        if (authState === 'AUTHENTICATED_NO_ORG' || authState === 'LOOKUP_FAILED') {
          setDecisionState(authState)
          navigate('/', { replace: true })
          return
        }
      }

      navigate('/login', { replace: true })
    }

    void run()
  }, [location.search, refresh, navigate, setDecisionState])

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Finalizing authentication...</h1>
      <p className="mt-3 text-slate-300">Restoring access token from backend refresh endpoint.</p>
    </main>
  )
}

export default AuthCallbackPage
