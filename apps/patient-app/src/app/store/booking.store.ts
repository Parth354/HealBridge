// src/app/store/booking.store.ts
import { create } from 'zustand'
type S = { doctorId?: string; clinicId?: string; slot?: { start_ts:string; end_ts:string }; set:(p:Partial<S>)=>void; clear:()=>void }
export const useBookingStore = create<S>(set=>({ set:(p)=>set(p), clear:()=>set({ doctorId:undefined, clinicId:undefined, slot:undefined }) }))
