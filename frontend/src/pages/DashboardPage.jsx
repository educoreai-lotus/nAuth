import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function DashboardPage() {
  const navigate = useNavigate()
  const { authState, logout } = useAuth()

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Authenticated Area</h1>
      <p className="mt-3 text-slate-300">Current auth state: {authState}</p>

      <button
        type="button"
        className="mt-6 rounded-md bg-rose-500 px-4 py-2 font-medium hover:bg-rose-400"
        onClick={async () => {
          await logout()
          navigate('/login', { replace: true })
        }}
      >
        Logout
      </button>
    </main>
  )
}

export default DashboardPage
