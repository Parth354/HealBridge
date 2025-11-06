// src/app/hooks/useLocation.ts
import * as Location from 'expo-location'
import { useEffect } from 'react'
import { useLocationStore } from '../store/location.store'

export function useLocationOnce() {
  const set = useLocationStore(s => s.set)
  
  useEffect(() => {
    let isMounted = true;

    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;
        
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          });
          if (!isMounted) return;
          
          set(pos.coords.latitude, pos.coords.longitude);
        }
      } catch (error) {
        console.warn('Error getting location:', error);
      }
    };

    getLocation();

    return () => {
      isMounted = false;
    };
  }, [set]);
}
