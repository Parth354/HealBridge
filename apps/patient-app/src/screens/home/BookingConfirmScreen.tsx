// src/screens/home/BookingConfirmScreen.tsx
import React from 'react'
import { View } from 'react-native'
import { Button, Text } from '../../components'
import { useCreateHold, useConfirmFromHold } from 'api-client'
export default function BookingConfirmScreen({ route, navigation }: any) {
  const { doctorId, clinicId, slot } = route.params
  const hold = useCreateHold()
  const confirm = useConfirmFromHold()
  async function book() {
    const h = await hold.mutateAsync({ doctor_id: doctorId, clinic_id: clinicId, start_ts: slot.start_ts, end_ts: slot.end_ts })
    await confirm.mutateAsync({ holdId: h.id })
    navigation.replace('History')
  }
  return <View style={{ padding:16 }}><Text variant="title">Confirm</Text><Button title="Confirm" onPress={book}/></View>
}
