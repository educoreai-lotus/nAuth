import { getGithubLoginUrl, getGoogleLoginUrl } from '../services/authApi'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../context/ThemeContext'
import logoDark from '../assets/logo-dark.jpg'
import logoLight from '../assets/logo-light.jpg'

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  )
}

function LoginPage() {
  const { error } = useAuth()
  const { isDay, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen antialiased transition-all duration-300 ease-in-out">
      <header
        className={`fixed top-0 right-0 left-0 z-50 border-b shadow-lg backdrop-blur-md transition-all duration-300 ease-in-out ${
          isDay
            ? 'border-neutral-200 bg-[#ffffff]'
            : 'border-neutral-700 bg-[#0f172a]'
        }`}
      >
        <div className="container mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <img
            src={isDay ? logoLight : logoDark}
            alt=""
            className="ml-2 h-20 w-auto object-contain"
          />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDay ? 'Switch to night mode' : 'Switch to day mode'}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-in-out ${
              isDay
                ? 'border-neutral-300 bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                : 'border-neutral-600 bg-neutral-800 text-neutral-50 hover:bg-neutral-700'
            }`}
          >
            {isDay ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </header>

      <div className="h-28" aria-hidden />

      <main className="container mx-auto max-w-3xl px-6 py-14 sm:py-16">
        <div className="max-w-2xl">
          <h1
            className={`text-3xl font-bold leading-tight tracking-tight transition-all duration-300 ease-in-out sm:text-4xl ${
              isDay ? 'text-neutral-900' : 'text-neutral-50'
            }`}
          >
            Welcome to EDUCORE-AI Platform
          </h1>
          <p
            className={`mt-5 max-w-xl text-base leading-relaxed transition-all duration-300 ease-in-out ${
              isDay ? 'text-neutral-500' : 'text-neutral-300'
            }`}
          >
            Access your intelligent learning environment and continue your personalized learning journey.
          </p>
        </div>

        <section
          className={`mt-10 space-y-3 rounded-lg border p-6 shadow-lg transition-all duration-300 ease-in-out ${
            isDay
              ? 'border-neutral-200 bg-[#ffffff]'
              : 'border-neutral-700 bg-[#1e293b]'
          }`}
        >
          <button
            type="button"
            className="w-full rounded-md bg-primary-700 px-4 py-2 font-medium text-white transition-all duration-300 ease-in-out hover:bg-primary-800 active:bg-primary-900"
            onClick={() => {
              window.location.href = getGoogleLoginUrl()
            }}
          >
            Continue with Google
          </button>
          <button
            type="button"
            className="w-full rounded-md bg-primary-700 px-4 py-2 font-medium text-white transition-all duration-300 ease-in-out hover:bg-primary-800 active:bg-primary-900"
            onClick={() => {
              window.location.href = getGithubLoginUrl()
            }}
          >
            Continue with GitHub
          </button>
        </section>

        {error ? (
          <p
            className={`mt-4 rounded-md border px-4 py-2 text-sm transition-all duration-300 ease-in-out ${
              isDay
                ? 'border-neutral-200 bg-rose-50 text-rose-800'
                : 'border-neutral-600 bg-rose-950/50 text-rose-100'
            }`}
          >
            {error}
          </p>
        ) : null}
      </main>
    </div>
  )
}

export default LoginPage
