import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DecisionStatePage from './pages/DecisionStatePage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import WaitingApprovalPage from './pages/WaitingApprovalPage'
import { DIRECTORY_FRONTEND_URL } from './constants/directory'

function App() {
  const { loading, isAuthenticated, authState, accessToken } = useAuth()
  const location = useLocation()
  const hasTriggeredAutoHandoff = useRef(false)

  useEffect(() => {
    if (loading || hasTriggeredAutoHandoff.current) {
      return
    }

    const isCallbackRoute = location.pathname === '/auth/callback'
    const params = new URLSearchParams(location.search)
    const callbackResult = params.get('result')
    const isCallbackQueryFlow = callbackResult === 'success' || callbackResult === 'decision'
    if (isCallbackRoute || isCallbackQueryFlow) {
      return
    }

    if (isAuthenticated && authState === 'AUTHENTICATED_LINKED' && accessToken) {
      hasTriggeredAutoHandoff.current = true
      window.location.href = `${DIRECTORY_FRONTEND_URL}#access_token=${encodeURIComponent(accessToken)}`
    }
  }, [loading, isAuthenticated, authState, accessToken, location.pathname, location.search])

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-slate-300">Bootstrapping auth session...</p>
      </main>
    )
  }

  const isDecisionState = ['AUTHENTICATED_NO_ORG', 'LOOKUP_FAILED'].includes(authState)

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/waiting-approval" element={<WaitingApprovalPage />} />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          ) : authState === 'USER_NOT_FOUND' ? (
            <Navigate to="/waiting-approval" replace />
          ) : isDecisionState ? (
            <DecisionStatePage stateCode={authState} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  )
}

export default App
