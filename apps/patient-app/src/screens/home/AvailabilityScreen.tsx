// src/screens/home/AvailabilityScreen.tsx
import React from 'react'
import { View, FlatList, TouchableOpacity } from 'react-native'
import { Text } from '../../components'
import { useAvailability } from 'api-client'
import  { toTime } from 'utils'
export default function AvailabilityScreen({ route, navigation }: any) {
  const { doctorId, clinicId } = route.params
  const date = new Date().toISOString().slice(0,10)
  const { data } = useAvailability({ doctorId, clinicId, date })
  return <View style={{ flex:1, padding:12 }}>
    <FlatList data={data||[]} keyExtractor={(i)=>i.start_ts} renderItem={({item})=>
      <TouchableOpacity onPress={()=>navigation.navigate('BookingConfirm',{ doctorId, clinicId, slot:item })}>
        <Text>{toTime(item.start_ts)}</Text>
      </TouchableOpacity>}
    />
  </View>
}
