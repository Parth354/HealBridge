// src/app/navigation/RootNavigator.tsx
import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AuthNavigator from './AuthNavigator'
import MainNavigator from './MainNavigator'
import { useAuthStore } from '../store/auth.store'
const S = createNativeStackNavigator()
export default function RootNavigator() {
  const token = useAuthStore(s=>s.token)
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      {token ? <S.Screen name="Main" component={MainNavigator}/> : <S.Screen name="Auth" component={AuthNavigator}/>}
    </S.Navigator>
  )
}
