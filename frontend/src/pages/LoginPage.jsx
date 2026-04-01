import { getGithubLoginUrl, getGoogleLoginUrl } from '../services/authApi'
import { useAuth } from '../hooks/useAuth'

function LoginPage() {
  const { loading, error, refresh } = useAuth()

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Sign in to nAuth</h1>
      <p className="mt-3 text-slate-300">
        Login starts on the backend. The frontend never stores refresh tokens.
      </p>

      <section className="mt-8 space-y-3 rounded-lg border border-slate-700 bg-slate-900/50 p-6">
        <button
          type="button"
          className="w-full rounded-md bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:bg-white"
          onClick={() => {
            window.location.href = getGoogleLoginUrl()
          }}
        >
          Continue with Google
        </button>
        <button
          type="button"
          className="w-full rounded-md bg-slate-700 px-4 py-2 font-medium hover:bg-slate-600"
          onClick={() => {
            window.location.href = getGithubLoginUrl()
          }}
        >
          Continue with GitHub
        </button>
      </section>

      <section className="mt-6 rounded-lg border border-slate-700 bg-slate-900/50 p-6">
        <h2 className="text-lg font-medium">After backend callback</h2>
        <p className="mt-2 text-sm text-slate-300">
          If your provider flow finished in backend JSON response, click below to restore session via
          <code className="mx-1 rounded bg-slate-800 px-1 py-0.5">POST /auth/refresh</code>.
        </p>
        <button
          type="button"
          disabled={loading}
          className="mt-4 rounded-md bg-indigo-500 px-4 py-2 font-medium hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => {
            void refresh()
          }}
        >
          {loading ? 'Checking session...' : 'Finalize login and refresh session'}
        </button>
      </section>

      {error ? (
        <p className="mt-4 rounded border border-rose-400/40 bg-rose-950/30 px-4 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
    </main>
  )
}

export default LoginPage
