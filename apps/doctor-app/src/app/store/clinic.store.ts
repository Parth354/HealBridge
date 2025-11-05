import { create } from 'zustand'

type Clinic = { id: string; name: string; address?: string; fees?: number; radiusKm?: number }

type S = { clinic: Clinic | null; setClinic: (c: Clinic) => void }

export const useClinicStore = create<S>((set) => ({ clinic: null, setClinic: (c) => set({ clinic: c }) }))

