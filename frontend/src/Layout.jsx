import { useTheme } from './context/ThemeContext'

function Layout({ children }) {
  const { isDay } = useTheme()

  return (
    <div
      className={`min-h-screen transition-all duration-300 ease-in-out ${
        isDay ? 'bg-[#f8fafc]' : 'bg-[#1e293b]'
      }`}
    >
      {children}
    </div>
  )
}

export default Layout
