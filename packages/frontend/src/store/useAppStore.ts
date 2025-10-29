import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { User } from '../types'

interface AppState {
  user: User | null
  isConnected: boolean
  theme: 'light' | 'dark'
  language: 'en' | 'zh'
  
  // Actions
  setUser: (user: User | null) => void
  setConnected: (connected: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  setLanguage: (language: 'en' | 'zh') => void
  disconnect: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isConnected: false,
        theme: 'light',
        language: 'zh',
        
        setUser: (user) => set({ user }),
        setConnected: (connected) => set({ isConnected: connected }),
        setTheme: (theme) => set({ theme }),
        setLanguage: (language) => set({ language }),
        disconnect: () => set({ user: null, isConnected: false }),
      }),
      {
        name: 'knowton-storage',
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
        }),
      }
    )
  )
)
