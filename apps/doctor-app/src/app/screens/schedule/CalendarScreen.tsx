import React from 'react'
import { View, Button } from 'react-native'
import { Calendar } from 'react-native-calendars'
import { useNavigation } from '@react-navigation/native'

export default function CalendarScreen() {
  const nav = useNavigation<any>()

  return (
    <View style={{ flex: 1 }}>
      <Calendar onDayPress={(d) => nav.navigate('TodayList', { date: d.dateString })} />
      <View style={{ padding: 16 }}>
        <Button title="Edit Availability" onPress={() => nav.navigate('AvailabilityEditor')} />
      </View>
    </View>
  )
}

