import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('night-mode')
  const isDay = theme === 'day-mode'

  useEffect(() => {
    document.body.classList.remove('theme-app-light', 'theme-app-dark')
    document.body.classList.add(isDay ? 'theme-app-light' : 'theme-app-dark')
  }, [isDay])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'day-mode' ? 'night-mode' : 'day-mode'))
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, isDay, toggleTheme }),
    [theme, isDay, toggleTheme],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
