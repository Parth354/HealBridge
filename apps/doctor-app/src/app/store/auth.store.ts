import { create } from 'zustand'

type User = { id: string; name: string; phone?: string }

type S = {
  token: string | null
  user: User | null
  setAuth: (t: string, u: User) => void
  clear: () => void
}

export const useAuthStore = create<S>((set) => ({
  token: null,
  user: null,
  setAuth: (t, u) => set({ token: t, user: u }),
  clear: () => set({ token: null, user: null })
}))

