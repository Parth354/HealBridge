import React from 'react'
import { View, Button } from 'react-native'
import { useAuthStore } from '../../store/auth.store'

export default function SettingsScreen() {
  const { clear } = useAuthStore()

  return (
    <View style={{ padding: 16 }}>
      <Button title="Logout" onPress={clear} />
    </View>
  )
}

