import React from 'react'
import { View, Text, Button } from 'react-native'
import { useNavigation } from '@react-navigation/native'

export default function AppointmentRow({ item }: any) {
  const nav = useNavigation<any>()

  return (
    <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
      <Text style={{ fontWeight: '600' }}>{item.patient.name}</Text>
      <Text>{item.time} • {item.status}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Button title="Pre-visit" onPress={()=> nav.navigate('PrevisitSummary', { appointmentId: item.id })} />
        <Button title="Start" onPress={()=> nav.navigate('Consult', { appointmentId: item.id })} />
        <Button title="Rx" onPress={()=> nav.navigate('PrescriptionComposer', { appointmentId: item.id })} />
      </View>
    </View>
  )
}

