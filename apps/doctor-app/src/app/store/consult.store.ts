import { create } from 'zustand'

type S = { activeAppointmentId: string | null; setActive: (id: string|null) => void }

export const useConsultStore = create<S>((set) => ({ activeAppointmentId: null, setActive: (id) => set({ activeAppointmentId: id }) }))

