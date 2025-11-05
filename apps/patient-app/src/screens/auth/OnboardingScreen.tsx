// src/screens/auth/OnboardingScreen.tsx
import React from 'react'
import { View } from 'react-native'
import { Text, Button } from '../../components'
export default function OnboardingScreen({ navigation }: any) {
  return <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><Text variant="title">Veersa Care</Text><Button title="Next" onPress={()=>navigation.navigate('Otp')}/></View>
}
