// src/screens/home/HomeScreen.tsx
import React from 'react'
import { View } from 'react-native'
import { Button, Text } from '../../components'
export default function HomeScreen({ navigation }: any) {
  return <View style={{ padding:16 }}><Text variant="title">Home</Text><Button title="Triage" onPress={()=>navigation.navigate('Triage')}/></View>
}
