import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

export type Settings = {
  theme: Theme
  lineHeight: number
  tabSize: number
  defaultViewMode: 'side-by-side' | 'inline'
  defaultHighlighterEnabled: boolean
  defaultLinkHighlights: boolean
  defaultLinkMode: 'line-number' | 'visual-position'
}

type SettingsContextType = {
  settings: Settings
  updateSettings: (newSettings: Partial<Settings>) => void
}

const defaultSettings: Settings = {
  theme: "system",
  lineHeight: 1.5,
  tabSize: 4,
  defaultViewMode: 'side-by-side',
  defaultHighlighterEnabled: false,
  defaultLinkHighlights: true,
  defaultLinkMode: 'line-number'
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => null,
})

type SettingsProviderProps = {
  children: React.ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem("code-reviewer-settings")
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) }
      } catch {
        return defaultSettings
      }
    }
    return defaultSettings
  })

  useEffect(() => {
    localStorage.setItem("code-reviewer-settings", JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (settings.theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(settings.theme)
  }, [settings.theme])

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => {
  const context = useContext(SettingsContext)

  if (context === undefined)
    throw new Error("useSettings must be used within a SettingsProvider")

  return context
}