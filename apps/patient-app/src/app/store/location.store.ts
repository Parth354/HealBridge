import { create } from 'zustand'
type S = { lat?: number; lon?: number; set: (lat:number,lon:number)=>void }
export const useLocationStore = create<S>(set=>({ set:(lat,lon)=>set({ lat, lon }) }))
