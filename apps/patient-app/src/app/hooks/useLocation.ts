// src/app/hooks/useLocation.ts
import * as Location from 'expo-location'
import { useEffect } from 'react'
import { useLocationStore } from '../store/location.store'
export function useLocationOnce() {
  const set = useLocationStore(s=>s.set)
  useEffect(()=>{(async()=>{ const { status } = await Location.requestForegroundPermissionsAsync(); if(status==='granted'){ const pos = await Location.getCurrentPositionAsync({}); set(pos.coords.latitude, pos.coords.longitude) } })()},[set])
}
