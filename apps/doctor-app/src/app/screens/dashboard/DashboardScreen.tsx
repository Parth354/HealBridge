import React from 'react'
import { View, Text, Button } from 'react-native'
import { useAppointments } from 'api-client/hooks/useAppointments'
import { useNavigation } from '@react-navigation/native'

export default function DashboardScreen() {
  const { data: today } = useAppointments({ day: 'today' })
  const nav = useNavigation<any>()
  const total = today?.length || 0
  const started = today?.filter(a => a.status === 'in_consult').length || 0
  const waiting = today?.filter(a => a.status === 'checked_in').length || 0

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Today</Text>
      <Text>Total: {total} | Waiting: {waiting} | In consult: {started}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Today List" onPress={() => nav.navigate('TodayList')} />
        <Button title="Calendar" onPress={() => nav.navigate('Calendar')} />
        <Button title="Clinic" onPress={() => nav.navigate('ClinicProfile')} />
      </View>
    </View>
  )
}

