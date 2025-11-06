import React from 'react'
import MapView, { Marker } from 'react-native-maps'
export default function Map({ lat, lon }: { lat: number; lon: number }) {
  const region = { latitude: lat, longitude: lon, latitudeDelta: 0.05, longitudeDelta: 0.05 }
  return <MapView style={{ height: 200 }} initialRegion={region}><Marker coordinate={{ latitude: lat, longitude: lon }}/></MapView>
}
