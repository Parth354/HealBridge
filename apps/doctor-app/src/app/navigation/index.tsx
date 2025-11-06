import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import AuthNavigator from './AuthNavigator'
import MainNavigator from './MainNavigator'
import { useAuthStore } from '../store/auth.store'
import * as Linking from 'expo-linking'

const linking = {
  prefixes: ['veersa-doc://'],
  config: { screens: { Consult: 'consult/:appointmentId' } }
}

export default function RootNav() {
  const authed = useAuthStore((s) => !!s.token)
  return (
    <NavigationContainer linking={linking}>
      {authed ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  )
}

