// src/screens/auth/ProfileScreen.tsx
import React from 'react'
import { View } from 'react-native'
import { Button, Text } from '../../components'
export default function ProfileScreen({ navigation }: any) {
  return <View style={{ padding:16 }}><Text variant="title">Profile</Text><Button title="Continue" onPress={()=>navigation.replace('Home')}/></View>
}
