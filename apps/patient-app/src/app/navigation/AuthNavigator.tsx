// src/app/navigation/AuthNavigator.tsx
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import OnboardingScreen from '../../screens/auth/OnboardingScreen'
import OtpScreen from '../../screens/auth/OtpScreen'
import ProfileScreen from '../../screens/auth/ProfileScreen'
const S = createNativeStackNavigator()
export default function AuthNavigator() {
  return (
    <S.Navigator>
      <S.Screen name="Onboarding" component={OnboardingScreen}/>
      <S.Screen name="Otp" component={OtpScreen}/>
      <S.Screen name="Profile" component={ProfileScreen}/>
    </S.Navigator>
  )
}
