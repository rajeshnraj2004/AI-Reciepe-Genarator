import React, { createContext, useContext, useState } from 'react'

const ThemeContext = createContext<any>(null)

export const ThemeProvider = ({ children }: any) => {
  const [dark, setDark] = useState(false)

  const colors = dark
    ? {
        background: '#0f172a',
        card: '#1e293b',
        primary: '#8b5cf6',
        secondary: '#facc15',
        text: '#ffffff',
        subtext: '#94a3b8',
      }
    : {
        background: '#f8fafc',
        card: '#ffffff',
        primary: '#8b5cf6',
        secondary: '#facc15',
        text: '#0f172a',
        subtext: '#64748b',
      }

  return (
    <ThemeContext.Provider value={{ colors, dark, toggle: () => setDark(!dark) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)