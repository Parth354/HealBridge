import React from 'react'
import { View, FlatList } from 'react-native'
import { useAppointments } from 'api-client/hooks/useAppointments'
import AppointmentRow from '../../components/AppointmentRow'

export default function TodayListScreen({ route }: any) {
  const { date } = route?.params || {}
  const { data } = useAppointments({ day: date || 'today' })

  return (
    <View style={{ flex: 1 }}>
      <FlatList data={data || []} keyExtractor={(i:any) => i.id} renderItem={({ item }) => (
        <AppointmentRow item={item} />
      )} />
    </View>
  )
}

