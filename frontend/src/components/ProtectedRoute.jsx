import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function ProtectedRoute({ children }) {
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return <p className="px-6 py-8 text-slate-300">Resolving auth session...</p>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
