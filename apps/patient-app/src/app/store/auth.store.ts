import { create } from 'zustand'

export type AuthState = {
  token: string | null
  user: any | null
  setAuth: (t: string, u: any) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: (t, u) => set({ token: t, user: u }),
  clear: () => set({ token: null, user: null })
}))
