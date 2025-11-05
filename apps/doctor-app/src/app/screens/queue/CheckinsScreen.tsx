import React from 'react'
import { View, Text } from 'react-native'
import { useCheckins } from 'api-client/hooks/useAppointments'

export default function CheckinsScreen() {
  const { data } = useCheckins()

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: '600' }}>Check-ins</Text>
      {data?.map((c:any)=> (
        <Text key={c.id}>{c.patient.name} • {c.status}</Text>
      ))}
    </View>
  )
}

