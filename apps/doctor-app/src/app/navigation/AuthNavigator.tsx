import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import OtpScreen from '../screens/auth/OtpScreen'

const Stack = createNativeStackNavigator()

export default function AuthNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Otp" component={OtpScreen} options={{ title: 'Login' }} />
    </Stack.Navigator>
  )
}

