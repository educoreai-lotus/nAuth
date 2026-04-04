import { useTheme } from './context/ThemeContext'

function Layout({ children }) {
  const { isDay } = useTheme()

  return (
    <div
      className={`min-h-screen transition-all duration-300 ease-in-out ${
        isDay ? 'bg-neutral-50' : 'bg-neutral-800'
      }`}
    >
      {children}
    </div>
  )
}

export default Layout
