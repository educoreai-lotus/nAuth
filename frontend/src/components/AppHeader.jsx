import { useState } from 'react'

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

function AppHeader() {
  const [theme, setTheme] = useState('night-mode')

  const isDay = theme === 'day-mode'

  const toggleTheme = () => {
    setTheme(isDay ? 'night-mode' : 'day-mode')
  }

  return (
    <>
      <header
        className={`fixed top-0 right-0 left-0 z-50 border-b shadow-lg backdrop-blur-md transition-all duration-300 ease-in-out ${
          isDay
            ? 'border-gray-200 bg-white/95'
            : 'border-gray-600 bg-slate-900/95'
        }`}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div
            className={`min-w-0 transition-all duration-300 ease-in-out ${
              isDay ? 'text-gray-700' : 'text-gray-300'
            }`}
          >
            <h1 className="text-3xl font-semibold tracking-tight">nAuth Frontend</h1>
            <p className="mt-2 text-sm">
              Starter UI shell for upcoming authentication screens.
            </p>
          </div>
          <div className="min-w-0 flex-1" aria-hidden />
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDay ? 'Switch to night mode' : 'Switch to day mode'}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-in-out ${
              isDay
                ? 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-emerald-100'
                : 'border-gray-700 bg-gray-800 text-white hover:bg-emerald-900/20'
            }`}
          >
            {isDay ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </header>
      <div className="h-[4.5rem]" aria-hidden />
    </>
  )
}

export default AppHeader
