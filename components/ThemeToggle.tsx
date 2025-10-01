'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const wantDark = saved ? saved === 'dark' : prefersDark
    document.documentElement.classList.toggle('dark', wantDark)
    setIsDark(wantDark)
  }, [])

  if (!mounted) return null

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      aria-label="切換主題"
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 active:scale-95"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}