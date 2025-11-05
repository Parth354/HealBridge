import { create } from 'zustand'

type DayConfig = { day: string; start: string; end: string; slotMins: number }

type S = {
  template: DayConfig[]
  setTemplate: (t: DayConfig[]) => void
}

export const useScheduleStore = create<S>((set) => ({
  template: [],
  setTemplate: (t) => set({ template: t })
}))

