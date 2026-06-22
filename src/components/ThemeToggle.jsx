import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-coral-50 dark:bg-coral-800 shadow-lg border border-coral-200 dark:border-coral-700 hover:bg-coral-100 dark:hover:bg-coral-700 transition cursor-pointer"
      aria-label="Toggle theme"
    >
      {dark ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-coral-500" />}
    </button>
  )
}
