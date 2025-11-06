// src/app/hooks/usePushToken.ts
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { useRegisterPushToken } from 'api-client'
export function useRegisterDevice() {
  const m = useRegisterPushToken()
  async function register() {
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') return
    const token = (await Notifications.getExpoPushTokenAsync()).data
    m.mutate({ deviceToken: token, platform: Platform.OS==='ios'?'ios':'android' })
  }
  return { register }
}
