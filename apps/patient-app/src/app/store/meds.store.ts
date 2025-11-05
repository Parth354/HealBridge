// src/app/store/meds.store.ts
import { create } from 'zustand'
type Med = { id:string; name:string; timeISO:string }
type S = { meds: Med[]; set:(m:Med[])=>void }
export const useMedsStore = create<S>(set=>({ meds:[], set:(m)=>set({ meds:m }) }))
